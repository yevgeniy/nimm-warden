(function() {
	


var model;
W = typeof W == 'undefined' ? require('../index').Warden : W;
Rep = typeof Rep == 'undefined' ? require('../index').Rep : Rep;

beforeEach(function () {
    model = {
        Name: 'foom',
        Members: [1, 2, 3, 4, 5],
		prop:{},
        Options: [
            {
                Code: 4,
                Name: "foo",
                Foo: 5,
                Options: [1, 2, 3, 4, {
                    Options: {
                        prop: 'hello world'
                    }
                }],
                Doom: [['a'], ['b'], ['c']]
            },
            {
                Code: 6,
                Name: "fum",
                foo: 'hello world',
                Fim: null,
                Doom: [['aaa'], ['bbb'], ['ccc']],
                AloneObject: {},
				prop:{}
            }
        ]
    };
});

describe('Rep...', function() {
	describe('_add...', function() {
		beforeEach(function() {
			Rep._dump();
		})
		it('if there is nothing in free push', function() {
			Rep._free=[];
			
			var a={},b={},c={};
			
			Rep._add(a);
			Rep._add(b);
			Rep._add(c);
			
			expect(Rep._rep[0]).toBe(a);
			expect(Rep._rep[1]).toBe(b);
			expect(Rep._rep[2]).toBe(c);
		})
		it('add at free indexes', function() {
			var a={},b={},c={};
			Rep._free=[1,5,10];
			
			Rep._add(a);
			
			expect(Rep._rep[1]).toBe(a);
			expect(Rep._free.length).toBe(2)
			expect(Rep._free[0]).toBe(5)
			
			Rep._add(b);
			
			expect(Rep._rep[5]).toBe(b);
			expect(Rep._free.length).toBe(1)
			expect(Rep._free[0]).toBe(10)
			
			Rep._add(c);
			
			expect(Rep._rep[10]).toBe(c);
			expect(Rep._free.length).toBe(0);
			
		})
		it('embed reference at on subject', function() {
			Rep._free=[2,4,6];
			
			var a={},b={},c={};
			
			Rep._add(a);
			Rep._add(b);
			Rep._add(c);
			
			expect(a.__rep__).toBe(2);
			expect(b.__rep__).toBe(4)
			expect(c.__rep__).toBe(6);
		})
	})
	describe('_remove...', function() {
		var a={},b={},c={};
		beforeEach(function() {
			Rep._dump();
			Rep._add(a);
			Rep._add(b);
			Rep._add(c);
		})
		it('clear at reference', function() {
			Rep._remove(a);
			
			expect(a.__rep__).toBe(null);
		})
		it('remove from rep with undefined', function() {
			Rep._remove(a);
			Rep._remove(b);

			expect(Rep._rep[0]).toBe(undefined);
			expect(Rep._rep[1]).toBe(undefined);			
		})
		it('removing adds index to free array', function() {
			Rep._remove(a);
			
			expect(Rep._free.length).toBe(1);
			expect(Rep._free[0]).toBe(0);
			
			
			Rep._remove(b);
			
			expect(Rep._free[1]).toBe(1);
			expect(Rep._free.length).toBe(2);

		})
	})
	describe('add...', function() {
		it('adds to rep', function() {
			spyOn(Rep,'_add').and.callThrough();
			
			var a=W(model);
			Rep.add(a);
			
			expect(Rep._add.calls.count()).toBe(1);
			expect(Rep._rep[0]).toBe(a);
		})
		it('set shadow based on selector', function() {
			var w=W(model)('>>Options');
			
			Rep.add(w);
			
			expect(w.__shadow__).toBeDefined();
			expect(w.__shadow__.length).toBe(3);
			expect(w.__shadow__[0]).toBe(model.Options);
			expect(w.__shadow__[1]).toBe(model.Options[0].Options)
			expect(w.__shadow__[2]).toBe(model.Options[0].Options[4].Options)
		})
	})
	describe('_runners...', function() {
		beforeEach(function() {
			Rep._dump();
		})
		it('run all selectors and return those with different reflection', function() {
			var a=W(model)('Members.*');
			var b=W(model)('Name | Options.*.Code');
			var c=W(model)('>>AloneObject');
			
			Rep.add(a);
			Rep.add(b);
			Rep.add(c);
			
			model.Members.push('hi');
			model.Options[0].Code=10;
			
			var res = Rep._runners();
			
			expect(res[0]).toBe(a);
			expect(res[1]).toBe(b);
		})
		it('update shadow after matched reflection', function() {
			var a=W(model)('Members.*');
			
			Rep.add(a);
			
			model.Members.push('hi');
			
			var res = Rep._runners();
			expect(res[0].__shadow__.length).toBe(a._exec().length);
			res[0].__shadow__.forEach(function(v,i) {
				expect(v).toBe(model.Members[i])
			});
		})
	})
	describe('queue...', function() {
		beforeEach(function() {
			Rep._dump();
		})
		it('sets queue to true', function() {
			Rep.queue()
			expect(Rep._queue).toBe(true);
			expect(Rep._t).toBeDefined();
		})
		it('if queue is set again it cancels t and creates a new one', function() {
			Rep.queue();
			var t=Rep._t;
			Rep.queue();
			expect(Rep._t!=t).toBe(true);
		});
		it('queue will run async', function(c) {
			spyOn(Rep, 'run');
			Rep.queue();
			setTimeout(function() {
				expect(Rep.run.calls.count()).toBe(1);
				c();
			},10);
		});
		it('queue will not run if _queue is false', function(c) {
			spyOn(Rep, 'run');
			Rep.queue();
			Rep._queue=false;
			setTimeout(function() {
				expect(Rep.run.calls.count()).toBe(0);
				c();
			},10);
		})
		it('set _queue to false before calling run', function(c) {
			spyOn(Rep, 'run').and.callFake(function() {
				expect(Rep._queue).toBe(false);
				c();
			})
			Rep.queue();
		})
	})
});

describe('warden...', function() {
	beforeEach(function() {
		Rep._dump();
	})
	describe('destroy...', function() {
		it('removes from rep', function() {
			var w = W(model).watch(function() {});
			expect(Rep._rep.indexOf(w)).not.toBe(-1);
			
			w.destroy();
			expect(Rep._rep.indexOf(w)).toBe(-1);
		})
		it('remove loaded wardens from models', function() {
			var w1 = W(model).watch(function(){});
			var w2 = W(model).watch(function(){});
			var w3 = W(model).watch(function(){});
			
			expect(model.__ward__.rep.indexOf(w1)).not.toBe(-1)
			expect(model.__ward__.rep.indexOf(w2)).not.toBe(-1);
			expect(model.__ward__.rep.indexOf(w2)).not.toBe(-1);
			
			w1.destroy();
			expect(model.__ward__.rep.indexOf(w1)).toBe(-1)
		})
	})
	
	describe('_setVal...', function() {
		describe('oldvalue...', function() {
			var old;
			var model1;
			var model2;
			beforeEach(function() {
				model1={};
				model2={};
				old={};
				Rep._dump();
			})
			it('removes parent from ward', function() {
				W(model1).alter('foo', old);
				W(model2).alter('foo', old);
				
				W(model1).alter('foo', {});
				expect(old.__ward__.indexOf(model)).toBe(-1)
			})
			it('if on multiple parents does not schedule cleanup', function() {
				spyOn(W, '_reflost');
				
				W(model1).alter('foo', old);
				W(model2).alter('foo', old);
				
				W(model1).alter('foo', {});
				
				expect(W._reflost.calls.count()).toBe(0);
			})
			it('if on same parent but on multiple props does not schedule cleanup', function() {
				spyOn(W, '_reflost');
				
				W(model1).alter('foo', old);
				W(model1).alter('boo', old);
				
				W(model1).alter('foo', {});
				expect(W._reflost.calls.count()).toBe(0)
			})
			it('calls clean up if no parents and on one prop', function() {
				spyOn(W, '_reflost');
				W(model1).alter('foo', old);
				
				W(model1).alter('foo', {});
				expect(W._reflost.calls.count()>0).toBe(true);
			})
			it('wardens on lost references are destroyed', function() {
				var w1=W(old).watch(function(){});
				var w2=W(old).watch(function(){});
				
				spyOn(w1, 'destroy').and.callThrough();
				spyOn(w2, 'destroy').and.callThrough();
				
				W(model1).alter('foo', old);
				
				W(model1).alter('foo',{});
				
				expect(w1.destroy.calls.count()).toBe(1);
				expect(w2.destroy.calls.count()).toBe(1);

			})
			it('clears coms on childs also lost reference', function() {
				var child={};
				
				var w1 = W(old).watch(function(){});
				var w2 = W(child).watch(function(){});
				
				spyOn(w1, 'destroy').and.callThrough();
				spyOn(w2, 'destroy').and.callThrough();
				
				W(old).alter('child1', child);
				W(model1).alter('foo', old);
				
				W(model1).alter('foo',123);

				expect(w1.destroy.calls.count()).toBe(1);
				expect(w2.destroy.calls.count()).toBe(1);

			})
			it('if child has multiple parants, does not clear', function() {
				var child={};
				
				var w1 = W(old).watch(function(){});
				var w2 = W(child).watch(function(){});
				
				spyOn(w1, 'destroy').and.callThrough();
				spyOn(w2, 'destroy').and.callThrough();
				
				W(old).alter('child', child);
				W(model1).alter('foo', old);
				W(model2).alter('child', child);
				
				W(model1).alter('foo',123);

				expect(w1.destroy.calls.count()).toBe(1);
				expect(w2.destroy.calls.count()).toBe(0);

			})
		})
	})
	describe('insertVals...', function() {
		it('inserts values', function() {
			var a={};
			var b={};
			W._insertVals(model.Options,1,[a,b])
			
			expect(model.Options.length).toBe(4)
			expect(model.Options[1]).toBe(a);
			expect(model.Options[2]).toBe(b);
		})
	})
	describe('removeVals...', function() {
		it('removes values', function() {
			var a={};
			var b={};
			W._insertVals(model.Options,2,[a,b])
			
			W._removeVals(model.Options,1,2);
			
			expect(model.Options.length).toBe(2);
			expect(model.Options[1]).toBe(b)
		})
		it('destroys loaded wards on lost ref items', function() {
			var a={};
			var b={};
			
			W(model.Options[1]).alter('prop', a); /*a found on 1 parent*/
			W(model.Options[1]).alter('foo', b); /*b found on 1 parents*/
			W(model.Options[0]).alter('foo', b);
			
			var w1=W(model.Options[1]).watch(function() {})
			var w2=W(model.Options[1].prop).watch(function(){})
			var w3=W(model.Options[1].foo).watch(function(){});
			
			spyOn(w1,'destroy').and.callThrough();
			spyOn(w2,'destroy').and.callThrough();
			spyOn(w3,'destroy').and.callThrough();
			
			W._removeVals(model.Options, 1, 1);
			
			expect(w1.destroy.calls.count()).toBe(1);
			expect(w2.destroy.calls.count()).toBe(1);
			expect(w3.destroy.calls.count()).toBe(0);
		})
	})
	describe('terminator triggers...', function() {
		describe('alter...', function() {
			it('alters property on targets', function() {
				W(model)('>>Options.*').alter('Code', 10);
				
				expect(model.Options[0].Code).toBe(10);
				expect(model.Options[1].Code).toBe(10);
			});
			it('sets queue on change', function() {
				W(model)('Options.0').alter('Code',4);
				expect(Rep._queue).toBe(false);
				
				W(model)('Options.0').alter('Code',10);
				expect(Rep._queue).toBe(true);
			})
		})
		
		describe('update...', function() {
			it('changes only the props already set', function() {
				W(model)('Options.*').update('Fim', 'foofum');
				
				expect(model.Options[0].Fim).toBeUndefined();
				expect(model.Options[1].Fim).toBe('foofum');
			})
			it('sets queue', function() {
				W(model)('Options.*').update('Fim', null);
				expect(Rep._queue).toBe(false);
				W(model)('Options.*').update('Fim', 123);
				expect(Rep._queue).toBe(true);
			})
		})
		describe('splice...', function() {
			it('splices array', function() {
				var a={},b={}
				W(model)('Options').splice(1,1,[a,b]);
				
				expect(model.Options[1]).toBe(a);
				expect(model.Options[2]).toBe(b);
			})
			it('sets queue', function() {
				var a={},b={}
				W(model)('notThere').splice(1,1,[a,b]);
				expect(Rep._queue).toBe(false);
				
				W(model)('Options').splice(1,1,[a,b]);
				expect(Rep._queue).toBe(true);
			})
		})
		describe('push...', function() {
			it('adds to array', function() {
				var a={},b={}
				W(model)('Options').push([a,b]);
				expect(model.Options[2]).toBe(a);
				expect(model.Options[3]).toBe(b);
			})
			it('sets queue', function() {
				var a={},b={}
				W(model)('notThere').push([a,b]);
				expect(Rep._queue).toBe(false);
				
				W(model)('Options').push([a,b]);
				expect(Rep._queue).toBe(true);
			})
		})
		describe('remove...', function() {
			it('remove from array by fn', function() {
				var opt=model.Options[1];
				W(model)('Options').remove(function(v,i) {
					return i==0;
				})
				
				expect(model.Options[0]).toBe(opt);
			})
			it('remove from array by obj', function() {
				var opt=model.Options[1];
				W(model)('Options').remove(model.Options[0])
				expect(model.Options[0]).toBe(opt);
			})
			it('sets queue', function() {
				W(model)('Options').remove(function(v,i) {
					return false;
				})
				expect(Rep._queue).toBe(false);
				
				W(model)('Options').remove(function(v,i) {
					return i==0;
				})
				expect(Rep._queue).toBe(true);
			})
		})
	})
	describe('watchers...', function() {
		describe('watch...', function() {
			it('notifies handler', function(c) {
				var fn = jasmine.createSpy('foo');
				W(model)('Options.*.Code').watch(fn);
				
				W(model)('Options.0').alter('Code',123);
				setTimeout(function() {
					expect(fn.calls.count()).toBe(1);
					c()
				})	
			});
			it('pipe on update', function(c) {
				var fn = jasmine.createSpy('foo');
				var i=0;
				W(model)('Options.*.Code').watch(function() {
					return ++i;
				}).pipe(fn);
				
				W(model)('Options.0').alter('Code',123);
				setTimeout(function() {
					expect(fn.calls.count()).toBe(1);
					expect(fn.calls.argsFor(0)[0]).toBe(1);
					c();
				})
			})
			it('embeds ref on models', function() {
				var w=W(model)('Options.*.Code')
					.or(model.Members)
					.or(model.prop).watch(function() {
					
					})
				expect(model.__ward__.rep.indexOf(w)).not.toBe(-1)
				expect(model.Members.__ward__.rep.indexOf(w)).not.toBe(-1)
				expect(model.prop.__ward__.rep.indexOf(w)).not.toBe(-1);
			})
		})
		describe('observe...', function() {
			it('runs handler on startup', function() {
				var fn = jasmine.createSpy('foo');
				W(model)('Options.*.Code').observe(fn);
				expect(fn.calls.count()).toBe(1);
			})
			it('notifies handler on change', function(c) {
				var fn = jasmine.createSpy('foo');
				W(model)('Options.*.Code').observe(fn);
				
				W(model)('Options.0').alter('Code',123);
				setTimeout(function() {
					expect(fn.calls.count()).toBe(2);
					c()
				})	
			});
			it('if pipe is set call pipe right away with reponse', function() {
				var fn = jasmine.createSpy('foo');
				W(model)('Options.*.Code').observe(function() {
					return 'hoolah';
				}).pipe(fn);
				
				W(model)('Options.0').alter('Code',123);
				expect(fn.calls.count()).toBe(1);
				expect(fn.calls.argsFor(0)[0]).toBe('hoolah');
			})
			it('pipe on update', function(c) {
				var fn = jasmine.createSpy('foo');
				var i=0;
				W(model)('Options.*.Code').observe(function() {
					return ++i;
				}).pipe(fn);
				
				W(model)('Options.0').alter('Code',123);
				setTimeout(function() {
					expect(fn.calls.count()).toBe(2);
					expect(fn.calls.argsFor(1)[0]).toBe(2);
					c();
				})
				
			})
			it('embeds ref on models', function() {
				var w=W(model)('Options.*.Code')
					.or(model.Members)
					.or(model.prop).observe(function() {
					
					})
				expect(model.__ward__.rep.indexOf(w)).not.toBe(-1)
				expect(model.Members.__ward__.rep.indexOf(w)).not.toBe(-1)
				expect(model.prop.__ward__.rep.indexOf(w)).not.toBe(-1);
			})
		})
	})
})

return;


describe('warden...', function () {

    describe('static...', function () {
        describe('_prop...', function () {
            var src, subject;
            beforeEach(function () {
                subject = {}
                src = {
                    foo: subject
                };
            });
            it('brand src if not yet done', function () {
                W._prop(src, 'foo');
                expect(src.__ward__).toBeDefined();
            });
            it('subject made ward of src', function () {
                W._prop(src, 'foo');
                expect(src.foo.__ward__.indexOf(src) > -1).toBe(true);
            });
            it('return subject', function () {
                var a = W._prop(src, 'foo');
                expect(a).toBe(subject);
            });
        });
        describe('_setProp...', function () {
            var src, oldsubject, newsubject;
            beforeEach(function () {
                oldsubject = {};
                newsubject = {}
                src = {
                    foo: oldsubject
                };
            })
            it('brand src if not yet branded', function () {
                W._setProp(src, 'foo', newsubject);

                expect(src.__ward__).toBeDefined();
            });

            it('if there is an old subject at the src, then old subject should no longer be a ward of the src', function () {
                W._prop(src, 'foo');

                expect(oldsubject.__ward__.indexOf(src) > -1).toBe(true);

                W._setProp(src, 'foo', newsubject);
                expect(oldsubject.__ward__.indexOf(src)).toBe(-1)
            });


            it('if prop is given, the new subject is assigned on the src at given prop', function () {
                W._setProp(src, 'foo', newsubject);
                expect(src.foo).toBe(newsubject);
            });

            it('if src is branded and subject is an object, subject should be made a ward of the src', function () {
                W._setProp(src, 'foo', newsubject);
                expect(newsubject.__ward__.indexOf(src) > -1).toBe(true);
            });
        });
		
	});
    describe('public...', function () {

		describe('each...', function () {
            it('over object', function () {
                it('each', function () {
					var src = {
                        foo: {},
                        boo: 123,
                        moo: 'asdf',
                        doo: {}
                    };
                    var w = W(src);
                    w.each(function (v, x) {
                        expect(v).toBe(src[x]);
                    });
                });
            });
            it('over array...', function () {
                it('each', function () {
					var src = [{}, {}, {}];
                    var w = W(src);
                    var c = 0;
                    w.each(function (v, x) {
                        expect(v).toBe(src[c]);
                        expect(x).toBe(c);
                        c++;
                    });
                });
            });
        });
        it('clone', function () {
            var sig = JSON.stringify(model);
			var w = W(model);
			var c = w.clone();

			expect(JSON.stringify(c)).toBe(sig);
        });
        
		it('destroy watch', function() {
			var w = W(model);
			var fn = jasmine.createSpy('foo');
		
			var obj = w.watch('altered', fn);

			obj.destroy();

			W(model).alter('foo', 123123123);
			
			expect(fn).not.toHaveBeenCalled();
		})
		
		it('getAll', function () {
            var src = {};
			var w = W(src);
			var res = w.getAll();
			expect(res[0]).toBe(src);
        });
        it('get', function () {
            var src = {};
			var w = W(src);
			var res = w.get();
			expect(res).toBe(src);
        });
        it('alter', function () {
            var src = {};
			W(src).alter('foo',123);
			expect(src.foo).toBe(123);
        });
        it('push', function () {
			var src = [];
			W(src).push([1, 2, 3]);
			expect(src.length).toBe(3)
			expect(src[0]).toBe(1);
			expect(src[1]).toBe(2);
			expect(src[2]).toBe(3);
        });
        it('splice', function () {
            var src = [1, 2, 3];
			W(src).splice(1, 0, 444);
			expect(src.toString()).toBe('1,444,2,3')
        });
		
        it('child', function () {
            var src = {
				foo: {}
			}
			var res = W(src).child('foo').get();
			expect(res).toBe(src.foo);
        });
        it('deep', function () {
			var src = {
				foo: {
					moo: 123
				}
			};
			var res = W(src).deep('moo').get();
			expect(res).toBe(src.foo.moo);
        });
        describe('all...', function () {
            it('as an array', function () {
                var src = [{}, 'foo', 123, {}];
				var res = W(src).all().getAll();
				expect(res[0]).toBe(src[0]);
				expect(res[1]).toBe(src[1]);
				expect(res[2]).toBe(src[2]);
				expect(res[3]).toBe(src[3]);
            });
            it('as an object', function () {
                var src = {
					foo: 123,
					moo: {},
					boo: {},
					coo: 'aasdf'
				};
				var res = W(src).all().getAll();
				expect(res.length).toBe(4);
				expect(res.indexOf(src.foo) > -1).toBe(true);
				expect(res.indexOf(src.moo) > -1).toBe(true);
				expect(res.indexOf(src.boo) > -1).toBe(true);
				expect(res.indexOf(src.coo) > -1).toBe(true);
            });
        })
        
        it('parents', function () {
            var src = {
                    foo: {
                        moo: {}
                    }
                };
                W._prop(src, 'foo');
                W._prop(src.foo, 'moo');
                var res = W(src.foo.moo).parents().getAll();
                expect(res.length).toBe(2);
                expect(res.indexOf(src.foo) > -1).toBe(true);
                expect(res.indexOf(src) > -1).toBe(true);
        });
        it('where', function () {
            var src = {
                        foo: 123,
                        boo: {
                            moo: 1
                        }
                    };
                    var res = W(src).where(function (v) { return v.foo == 123; }).get();
                    expect(res).toBe(src);

                    res = W(src).where(function (v) { return v.boo && v.boo.moo == 1 }).get();
                    expect(res).toBe(src);
        });
		
    });
    describe('constructor...', function () {
        it('object should return a new bot', function () {
            expect(model.__ward__).toBeUndefined();

            var w = W(model);
            expect(w).toBeDefined();
            expect(w.__iswarden__).toBe(true);
			expect(w._parts._model).toBe(model)
        });
    });
    
});
describe('selectors...', function () {

    it('get child', function () {
        var res = W(model).child('Members').child('2').get();
        expect(res).toBe(model.Members[2]);
    });
	it('get child by function', function(){
		var prop='Options';
		var sel = W(model).child(function(){
			return prop;
		}).child('1');
		var res = sel.get();
		expect(res).toBe(model.Options[1]);
		
		prop = 'Members';
		res = sel.get();
		expect(res).toBe(model.Members[1]);
	})
    it('get deep', function () {
        var res = W(model).child('Options').deep('prop').get();
        expect(res).toBe(model.Options[0].Options[4].Options.prop)
    });
    it('get all', function () {
        var res = W(model).child('Options').all().getAll();
        res.forEach(function (v) {
            expect(model.Options.indexOf(v) > -1).toBe(true);
        });
        expect(res.length).toBe(2);
    });
    
    it('get parents', function () {
        var res = W(model)('Options.1.AloneObject').parents().getAll();
        expect(res[0]).toBe(model.Options[1]);
        expect(res[1]).toBe(model.Options);
        expect(res[2]).toBe(model);
        expect(res.length).toBe(3);
    });
    it('get where', function () {
        var res = W(model).child('Options').all().where(function (v, x) {
            return x == 1;
        }).get();
        expect(res).toBe(model.Options[1]);
    });
    it('or can concat statements', function () {
        var res = W(model).child('Options').all()
            .or().deep('AloneObject')
			.getAll();

        expect(res[0]).toBe(model.Options[0]);
        expect(res[1]).toBe(model.Options[1]);
        expect(res[2]).toBe(model.Options[1].AloneObject);
        expect(res.length).toBe(3);
    })
	it('or supply a different model', function() {
		var otherModel={
			foo:{}
		}
		
		var res = W(model).child('Options').all()
            .or().deep('AloneObject')
			.or(otherModel).child('foo')
			.getAll();

        expect(res[0]).toBe(model.Options[0]);
        expect(res[1]).toBe(model.Options[1]);
        expect(res[2]).toBe(model.Options[1].AloneObject);
		expect(res[3]).toBe(otherModel.foo);
        expect(res.length).toBe(4);
	})
});
describe('terminators...', function() {
	describe('ref...', function() {
		var model, viewModel;
		beforeEach(function() {
			model={
				cartItems:[{Id:1}]
			}
			viewModel={
				model:null
			}
			
		})
		it('changes from primitive', function() {
			var cartItem = W(model)('cartItems.0');
			W(viewModel).ref('model', cartItem);
			
			expect(viewModel.model).toBe(cartItem);
		})
		it('changes to primitive', function() {
			var cartItem = W(model).child('cartItems').ref(0, null);
			expect(model.cartItems[0]).toBe(null);
		})
		it('changes from primitive to primitive', function() {
			W(viewModel).ref('model', 123);
			expect(viewModel.model).toBe(123);
		})
		it('changes from object to object', function() {
			var ci = W(model)('cartItems.0').get();
			W(viewModel).alter('model',ci);
			
			expect(viewModel.model).toBe(ci);
			expect(ci.__ward__.indexOf(model.cartItems)>-1).toBe(true);
			expect(ci.__ward__.indexOf(viewModel)>-1).toBe(true);
			
			var newci={Id:2};
			W(viewModel).ref('model', newci);
			expect(viewModel.model).toBe(newci);
			expect(newci.__ward__.indexOf(viewModel)>-1).toBe(true);
			
			expect(model.cartItems[0]).toBe(newci);
			expect(newci.__ward__.indexOf(model.cartItems)>-1).toBe(true);
			
			expect(ci.__ward__.length).toBe(0);
		})
	})
	describe('watch...', function() {
		it('pipe result', function() {
			var fn=jasmine.createSpy('a');
			var res = W(model).watch('foo', function() {
				return model.foo;
			}).pipe(fn);
			
			W(model).alter('foo', 234);
			
			expect(fn).toHaveBeenCalled();
			expect(fn.calls.argsFor(0)[0]).toBe(234);
		})
		describe('arguments...', function() {
			it('str', function(){
				var fn=jasmine.createSpy('foo');
				var fn1 = jasmine.createSpy('foo1');
				var fn2 = jasmine.createSpy('foo2');
				
				W(model).notify(fn).watch('name');
				W(model).notify(fn1).watch('foo');
				W(model).notify(fn2).watch();
				
				W(model).alter('name', 123);
				expect(fn).toHaveBeenCalled();
				expect(fn1).not.toHaveBeenCalled();
				expect(fn).toHaveBeenCalled();
				
			});
			it('fn', function(){
				var fn=jasmine.createSpy('foo');
				W(model).watch(fn);
				W(model).alter('name', 123);
				expect(fn).toHaveBeenCalled();
			})
			it('str fn', function(){
				var fn=jasmine.createSpy('foo');
				W(model).watch('foo', fn);
				W(model).alter('foo', 123);
				expect(fn).toHaveBeenCalled();
			});
		})
		
	})
	describe('watchAsync...', function() {
		it('executes function on the next frame', function(c) {
			var fn=jasmine.createSpy('foo');
			W(model).at('Name').watchAsync(fn);
			
			W(model).alter('Name', 234);
			W(model).alter('Name', 345);
			
			setTimeout(function() {
				expect(fn.calls.count()).toBe(1);
				c();
			});
		});
		it('response object can destroy watch', function(c) {

			var fn=jasmine.createSpy('foo');
			var res = W(model).at('Name').watchAsync(fn);
			
			W(model).alter('Name', 234);
			W(model).alter('Name', 345);
			
			res.destroy();
			
			setTimeout(function() {
				expect(fn.calls.count()).toBe(0);
				c();
			});

		});
	});
	describe('observe...', function() {
		it('is called right away, and watches', function() {
			var fn=jasmine.createSpy('a');
			var res = W(model).observe('Name', fn);
			
			expect(fn.calls.count()).toBe(1)
			
			W(model).alter('Name', 234);
			expect(fn.calls.count()).toBe(2)
			
		});
		it('destroyable', function() {
			var fn=jasmine.createSpy('a');
			var res = W(model).observe('Name', fn);
			
			expect(fn.calls.count()).toBe(1);
			
			W(model).alter('Name', 234);
			expect(fn.calls.count()).toBe(2)
			
			res.destroy();
			
			W(model).alter('Name', 345);
			expect(fn.calls.count()).toBe(2)
		})
		it('pipe result', function() {
			var fn=jasmine.createSpy('a');
			var res = W(model).observe('Name', function() {
				return model.Name;
			}).pipe(fn);
			
			expect(fn.calls.argsFor(0)[0]).toBe(model.Name);
			
			W(model).alter('Name', 234);
			
			expect(fn.calls.argsFor(1)[0]).toBe(234);
		})
		
		
	})
	describe('observeAsync...', function() {
		it('executes function on the next frame', function(c) {
			var fn=jasmine.createSpy('foo');
			W(model).at('Name').observeAsync(fn);
			
			setTimeout(function() {
				expect(fn.calls.count()).toBe(1);
				
				W(model).alter('Name',234);
				W(model).alter('Name',345);
				
			},1);
			setTimeout(function() {
				expect(fn.calls.count()).toBe(2);
				c();
			},100);
		});
		it('response has destructor', function(c) {
			var fn=jasmine.createSpy('foo');
			var res=W(model).at('Name').observeAsync(fn);
			
			setTimeout(function() {
				expect(fn.calls.count()).toBe(1);
				
				W(model).alter('Name',234);
				W(model).alter('Name',345);
				
				res.destroy();
			},1);
			setTimeout(function() {
				expect(fn.calls.count()).toBe(1);
				c();
			},100);
		});
	});

})
describe('events...', function () {
	
	describe('ref...', function() {
		it('prop fn | fn', function() {
			var mem1={Id:1};
			W(model).alter('Name', mem1);
			W(model).child('Members').alter(1, mem1);
			
			var fn1 = jasmine.createSpy('foo');
			var fn2 = jasmine.createSpy('boo');
			W(model).watch('Name', fn1);
			W(model)('Members').watch(fn2);
			
			var mem2={Id:2};
			W(model).ref('Name', mem2);
			expect(fn1.calls.count()).toBe(1);
			expect(fn2.calls.count()).toBe(1);	
		});
		it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).deep(1).at('foo').watch(fn);

            W(model).child('Options').all().ref('foo',444);

			expect(fn.calls.mostRecent().args[0].event).toBe(WE.SET);
            expect(fn.calls.mostRecent().args[0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[0].val).toBe(444);

			
            expect(fn.calls.mostRecent().args[1][0].from).toBe(undefined);
            expect(fn.calls.mostRecent().args[1][0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][0].src).toBe(model.Options[0]);
            expect(fn.calls.mostRecent().args[1][0].to).toBe(444);

            expect(fn.calls.mostRecent().args[1][1].from).toBe('hello world');
            expect(fn.calls.mostRecent().args[1][1].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][1].src).toBe(model.Options[1]);
            expect(fn.calls.mostRecent().args[1][1].to).toBe(444);
        });		
	})
    describe('alter...', function () {
        it('fn', function () {
            var fn = jasmine.createSpy('fn');
            var fn2 = jasmine.createSpy('fn2');
            W(model).watch(fn);
            W(model).watch(fn2);

            W(model).alter('foo',123);
            expect(fn).toHaveBeenCalled();
            expect(fn2).toHaveBeenCalled();
        });
        it('prop fn', function () {
            var fn = jasmine.createSpy('fn');
			var fn1 = jasmine.createSpy('fn1');
			var fn2 = jasmine.createSpy('fn2');
			
            W(model).at('foo').watch(fn)
			W(model).watch('foo', fn1)
			W(model).watch('boo', fn1)

            W(model).alter('foo',4);
            expect(fn.calls.count()).toBe(1)
			expect(fn1.calls.count()).toBe(1)
			expect(fn2.calls.count()).toBe(0)
        });
		
        it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).deep(1).at('foo').watch(fn);

            W(model).child('Options').all().alter('foo',444);

			expect(fn.calls.mostRecent().args[0].event).toBe(WE.SET);
            expect(fn.calls.mostRecent().args[0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[0].val).toBe(444);

            expect(fn.calls.mostRecent().args[1][0].from).toBe(undefined);
            expect(fn.calls.mostRecent().args[1][0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][0].src).toBe(model.Options[0]);
            expect(fn.calls.mostRecent().args[1][0].to).toBe(444);

            expect(fn.calls.mostRecent().args[1][1].from).toBe('hello world');
            expect(fn.calls.mostRecent().args[1][1].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][1].src).toBe(model.Options[1]);
            expect(fn.calls.mostRecent().args[1][1].to).toBe(444);
        });
		
	});
    describe('push...', function () {
        beforeEach(function () {
            model = [
                {
                    Code: 4,
                    Name: "foo",
                    Foo: 5,
                    Options: [1, 2, 3, 4, {
                        Options: {
                            prop: 'hello world'
                        }
                    }],
                    Doom: [['a'], ['b'], ['c']]
                },
                {
                    Code: 6,
                    Name: "fum",
                    foo: 'hello world',
                    Fim: null,
                    Doom: [['aaa'], ['bbb'], ['ccc']],
                    AloneObject: {}
                }
            ];
        });
        it('fn', function () {
            var fn = jasmine.createSpy('fn');
			
            W(model).watch(fn);

            W(model).push([123, 234]);
            expect(fn).toHaveBeenCalled();
			
			/////////
			var fn = jasmine.createSpy('fn');
            W(model).deep('Options').watch(fn);

            W(model)('0.Options').push({});
            expect(fn).toHaveBeenCalled();
        });
        
        it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch(fn);

            var newobj = {}
            W(model).push([newobj, 'hello feemer']);

			expect(fn.calls.mostRecent().args[0].event).toBe(WE.SPLICED);
            expect(fn.calls.mostRecent().args[0].add[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[0].add[1]).toBe('hello feemer');

            expect(fn.calls.mostRecent().args[1][0].added[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[1][0].added[1]).toBe('hello feemer');
			expect(fn.calls.mostRecent().args[1][0].added.at[0]).toBe(2);
			expect(fn.calls.mostRecent().args[1][0].added.at[1]).toBe(3);
			expect(fn.calls.mostRecent().args[1][0].removed.length).toBe(0);
			expect(fn.calls.mostRecent().args[1][0].removed.at.length).toBe(0);
            expect(isNaN(fn.calls.mostRecent().args[1][0].start)).toBe(true);
            expect(fn.calls.mostRecent().args[1][0].src).toBe(model);

        });
    });
	describe('remove...', function() {
		beforeEach(function () {
            model = [
				1,
				'foo bar was',
                {
                    Code: 4,
                    Name: "foo",
                    Foo: 5,
                    Options: [1, 2, 3, 4, {
                        Options: {
                            prop: 'hello world'
                        }
                    }],
                    Doom: [['a'], ['b'], ['c']]
                },
                {
                    Code: 6,
                    Name: "fum",
                    foo: 'hello world',
                    Fim: null,
                    Doom: [['aaa'], ['bbb'], ['ccc']],
                    AloneObject: {}
                },
				123,
				123
            ];
        });
		it('fn', function() {
			var r1 = model[0];
			var r2 = model[2];
			W(model).remove(function(v, i) {
				return v==model[0] || i==2;
			});
			
			expect(model[0]).toBe('foo bar was');
			expect(model[1].Code).toBe(6)
			expect(model[2]).toBe(123)
			
			//////////
			W(model).remove(123)
			expect(model.some(function(v){v==123})).toBe(false);
		})
		it('expose context', function() {
			var r1 = model[0];
			var r2 = model[2];
			var fn = jasmine.createSpy('foo');
			W(model).watch(fn);
			var f;
			W(model).remove(f=function(v, i) {
				return v==model[0] || i==2;
			});
			
			expect(fn).toHaveBeenCalled()
			expect(fn.calls.mostRecent().args[0].event).toBe(WE.SPLICED)
			expect(fn.calls.mostRecent().args[0].remove).toBe(f);
			
			expect(fn.calls.mostRecent().args[1][0].removed[0]).toBe(r1);
			expect(fn.calls.mostRecent().args[1][0].removed[1]).toBe(r2);
			expect(fn.calls.mostRecent().args[1][0].removed.at[0]).toBe(0);
			expect(fn.calls.mostRecent().args[1][0].removed.at[1]).toBe(2);
		})
	})
    describe('splice...', function () {
        beforeEach(function () {
            model = [
                {
                    Code: 4,
                    Name: "foo",
                    Foo: 5,
                    Options: [1, 2, 3, 4, {
                        Options: {
                            prop: 'hello world'
                        }
                    }],
                    Doom: [['a'], ['b'], ['c']]
                },
                {
                    Code: 6,
                    Name: "fum",
                    foo: 'hello world',
                    Fim: null,
                    Doom: [['aaa'], ['bbb'], ['ccc']],
                    AloneObject: {}
                }
            ];
        });
        it('fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch(fn);

            W(model).splice(1, 1, [123, 234]);
            expect(fn).toHaveBeenCalled();

			/////////			
			var fn = jasmine.createSpy('fn2');
            W(model).deep('Options').watch(fn)

            W(model)('0.Options').splice(0,0,'foo bar was');
            expect(fn).toHaveBeenCalled();
        });
        it('exposes context', function () {
			
			var toberemoved=model[1];
            var fn = jasmine.createSpy('fn');
            W(model).watch(fn);

            var newobj = {};
            W(model).splice(1,1, [newobj, 'hello feemer']);

			expect(fn.calls.mostRecent().args[0].event).toBe(WE.SPLICED);
            expect(fn.calls.mostRecent().args[0].add[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[0].add[1]).toBe('hello feemer');
			
            expect(fn.calls.mostRecent().args[0].cut).toBe(1);
            expect(fn.calls.mostRecent().args[0].start).toBe(1);

            expect(fn.calls.mostRecent().args[1][0].added[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[1][0].added[1]).toBe('hello feemer');
			expect(fn.calls.mostRecent().args[1][0].added.at[0]).toBe(1);
			expect(fn.calls.mostRecent().args[1][0].added.at[1]).toBe(2);
			expect(fn.calls.mostRecent().args[1][0].removed[0]).toBe(toberemoved);
			expect(fn.calls.mostRecent().args[1][0].removed.at[0]).toBe(1);
            expect(fn.calls.mostRecent().args[1][0].start).toBe(1);
            expect(fn.calls.mostRecent().args[1][0].src).toBe(model);
        });
    });
	describe('trigger...', function() {
		
		it('triggers exposing sig and src', function() {
			var fn = jasmine.createSpy('foo');
			W(model).child('Options').all().on('my-event').watch(fn);
			W(model)('Options.0').trigger('my-event', 123);
			
			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[0].event).toBe('my-event');
			expect(fn.calls.argsFor(0)[0].payload).toBe(123);
			
			expect(fn.calls.argsFor(0)[1][0].src).toBe(model.Options[0]);
		})
	});
});
describe('watchers...', function(){
	it('at', function(){
		var fn=jasmine.createSpy('foo');
		W(model).at('name').watch(fn);
		
		W(model).alter('foo', 123);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('name',123);
		expect(fn).toHaveBeenCalled();
	})
	it('notify', function(){
		var fn=jasmine.createSpy('foo');
		W(model).notify(fn).watch();
		W(model).alter('name', 123);
		expect(fn).toHaveBeenCalled();
	});
	
	describe('on...', function(){
		it('str', function(){
			var fn=jasmine.createSpy('foo');
			var fn1=jasmine.createSpy('foo1');
			var fn2=jasmine.createSpy('foo2');
			
			W(model).child('Options').on(WE.SET).watch(fn);
			W(model).child('Options').on(WE.SPLICED).watch(fn1);
			W(model).child('Options').watch(fn2);
			
			W(model).child('Options').alter(0, 123);
			expect(fn).toHaveBeenCalled();
			expect(fn1).not.toHaveBeenCalled();	
			expect(fn2).toHaveBeenCalled();
		});
	});
	it('eq', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'name').eq('foo').watch(fn);
		W(model).alter('name', 123);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('name', 'foo');
		expect(fn).toHaveBeenCalled();
	});
	
	it('is', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'name').is(function(x){
			return x=='foo';
		}).watch(fn);
		
		W(model).alter('name', 'boo');
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('name', 'foo');
		expect(fn).toHaveBeenCalled();
	})

});
describe('shorthand', function() {
	it('child selector', function() {
		var r = W(model)('Options.1.Code').get();
		expect(r).toBe(model.Options[1].Code);
	})
	it('parents selector', function() {
		var r = W(model)('Options.1')('<<Name').get();
		expect(r).toBe(model.Name);
	})
	it('deep selector', function() {
		var r = W(model)('>>prop').getAll();
		
		expect(r.indexOf(model.prop)>-1).toBe(true);
		expect(r.indexOf(model.Options[1].prop)>-1).toBe(true);
		expect(r.indexOf('hello world')>-1).toBe(true);
	});
	it('all selector', function() {
		var r = W(model)('Options.*').getAll();
		
		expect(r.indexOf(model.Options[0])).not.toBe(-1);
		expect(r.indexOf(model.Options[1])).not.toBe(-1);
	});
	it('or selector', function() {
		var r = W(model)('Options.*.Name | Name').getAll();		
		
		 expect(r.indexOf('foo')).not.toBe(-1);
		 expect(r.indexOf('fum')).not.toBe(-1);
		 expect(r.indexOf('foom')).not.toBe(-1);
	});
	it('at auditor', function() {
		var fn = jasmine.createSpy('foo');
		W(model)('@Name').watch(fn);
		
		W(model).alter('Name',345);
		expect(fn.calls.count()).toBe(1);
	});
	it('on auditor', function() {
		var fn=jasmine.createSpy('foo');
		W(model)('~hello-world').watch(fn);
		
		W(model).trigger('hello-world');
		expect(fn.calls.count()).toBe(1);
	});
	
})

})()
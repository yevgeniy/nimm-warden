var model;
var W = typeof W == 'undefined' ? require('../index').Warden : W;
var WardenEvent = typeof WardenEvent=='undefined' ? require('../index').WardenEvent : WardenEvent;
var WE = WardenEvent;


beforeEach(function () {
    model = {
        Name: 'foom',
        Members: [1, 2, 3, 4, 5],
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
                AloneObject: {}
            }
        ]
    };
});
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
        it('brood', function () {
            var src = {
				foo: {
					moo: 123
				}
			};
			var res = W(src).brood('foo.moo').get();
			expect(res).toBe(src.foo.moo);
        });
        it('descendant', function () {
			var src = {
				foo: {
					moo: 123
				}
			};
			var res = W(src).descendant('moo').get();
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
        it('parent', function () {
            var src = {
                    foo: {}
                };
                W._prop(src, 'foo');
                var res = W(src.foo).parent().get();
                expect(res).toBe(src);
        });
        it('ancestors', function () {
            var src = {
                    foo: {
                        moo: {}
                    }
                };
                W._prop(src, 'foo');
                W._prop(src.foo, 'moo');
                var res = W(src.foo.moo).ancestors().getAll();
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
    it('get brood', function () {
        var res = W(model).child('Options').brood('0.Doom.1').get();
        expect(res).toBe(model.Options[0].Doom[1]);
    });
    it('get descendant', function () {
        var res = W(model).child('Options').descendant('prop').get();
        expect(res).toBe(model.Options[0].Options[4].Options.prop)
    });
    it('get all', function () {
        var res = W(model).child('Options').all().getAll();
        res.forEach(function (v) {
            expect(model.Options.indexOf(v) > -1).toBe(true);
        });
        expect(res.length).toBe(2);
    });
    it('get parent', function () {
        var res = W(model).child('Options').parent().get();
        expect(res).toBe(model);
    });
    it('get ancestors', function () {
        var res = W(model).brood('Options.1.AloneObject').ancestors().getAll();
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
            .or().descendant('AloneObject')
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
            .or().descendant('AloneObject')
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
			var cartItem = W(model).brood('cartItems.0');
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
			var ci = W(model).brood('cartItems.0').get();
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
		
		it('watch complex selector', function() {
			var otherModel={
				foo:123,
				boo:{
					a:2
				}
			}
			var fn=jasmine.createSpy('foo');
			W(model).child('Options').all().at('Code')
				.or().child('Members')
				.or(otherModel).on(WE.SET)
				.or(otherModel).child('boo').at('a').gt(5)
				.or(otherModel).child('boo').at('a').lt(10)
				.watch(fn)
				
			W(model).child('Options').child(0).alter('Code',123);

			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[1][0].prop).toBe('Code')
			expect(fn.calls.argsFor(0)[1][0].to).toBe(123)
			
			fn.calls.reset()
			
			W(model).child('Members').push(345)
			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[1][0].src).toBe(model.Members)
			expect(fn.calls.argsFor(0)[1][0].added[0]).toBe(345)
				
			fn.calls.reset()
			
			W(otherModel).alter('foo',432);
			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[1][0].prop).toBe('foo')
			expect(fn.calls.argsFor(0)[1][0].to).toBe(432);
		
			fn.calls.reset()
			
			W(otherModel).child('boo').alter('a',11);
			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[1][0].prop).toBe('a')
			expect(fn.calls.argsFor(0)[1][0].to).toBe(11)
				
			fn.calls.reset()
			
			W(otherModel).child('boo').alter('a',7);
			expect(fn.calls.count()).toBe(1)
			expect(fn.calls.argsFor(0)[1][0].prop).toBe('a')
			expect(fn.calls.argsFor(0)[1][0].to).toBe(7)
		})
		it('destroy complex selector', function() {
			var otherModel={
				foo:123,
				boo:{
					a:2
				}
			}
			var fn=jasmine.createSpy('foo');
			var d=W(model).child('Options').all().at('Code')
				.or().child('Members')
				.or(otherModel).on(WE.SET)
				.or(otherModel).child('boo').at('a').gt(5)
				.or(otherModel).child('boo').at('a').lt(10)
				.watch(fn);
				
			d.destroy();
			
			W(model).child('Options').child(0).alter('Code',123);			
			W(model).child('Members').push(345)
			W(otherModel).alter('foo',432);
			W(otherModel).child('boo').alter('a',11);
			W(otherModel).child('boo').alter('a',7);
			
			expect(fn.calls.count()).toBe(0)
		})
	})
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
		it('observe complex selector', function() {
			var otherModel={
				foo:123,
				boo:{
					a:2
				}
			}
			var fn=jasmine.createSpy('foo');
			W(model).child('Options').all().at('Code')
				.or().child('Members')
				.or(otherModel).on(WE.SET)
				.or(otherModel).child('boo').at('a').gt(5)
				.or(otherModel).child('boo').at('a').lt(10)
				.observe(fn)
				
			W(model).child('Options').child(0).alter('Code',123);

			expect(fn.calls.count()).toBe(2)
			
			fn.calls.reset()
			
			W(model).child('Members').push(345)
			expect(fn.calls.count()).toBe(1)
				
			fn.calls.reset()
			
			W(otherModel).alter('foo',432);
			expect(fn.calls.count()).toBe(1)
		
			fn.calls.reset()
			
			W(otherModel).child('boo').alter('a',11);
			expect(fn.calls.count()).toBe(1)
				
			fn.calls.reset()
			
			W(otherModel).child('boo').alter('a',7);
			expect(fn.calls.count()).toBe(1)
		})
		it('destroy complex selector', function() {
			var otherModel={
				foo:123,
				boo:{
					a:2
				}
			}
			var fn=jasmine.createSpy('foo');
			var d=W(model).child('Options').all().at('Code')
				.or().child('Members')
				.or(otherModel).on(WE.SET)
				.or(otherModel).child('boo').at('a').gt(5)
				.or(otherModel).child('boo').at('a').lt(10)
				.watch(fn);
				
			d.destroy();
			
			W(model).child('Options').child(0).alter('Code',123);			
			W(model).child('Members').push(345)
			W(otherModel).alter('foo',432);
			W(otherModel).child('boo').alter('a',11);
			W(otherModel).child('boo').alter('a',7);
			
			expect(fn.calls.count()).toBe(0)
		})
	})

	
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
			W(model).brood('Members').watch(fn2);
			
			var mem2={Id:2};
			W(model).ref('Name', mem2);
			expect(fn1.calls.count()).toBe(1);
			expect(fn2.calls.count()).toBe(1);	
		});
		it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).descendant(1).at('foo').watch(fn);

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
            W(model).descendant(1).at('foo').watch(fn);

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
            W(model).descendant('Options').watch(fn);

            W(model).brood('0.Options').push({});
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
            W(model).descendant('Options').watch(fn)

            W(model).brood('0.Options').splice(0,0,'foo bar was');
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
	it('gt', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'code').gt(10).watch(fn);
		W(model).alter('code', 10);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('code', 11);
		expect(fn).toHaveBeenCalled();
	})
	it('lt', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'code').lt(10).watch(fn);
		W(model).alter('code', 10);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('code', 9);
		expect(fn).toHaveBeenCalled();
	})
	it('gte', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'code').gte(10).watch(fn);
		W(model).alter('code', 9);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('code', 10);
		expect(fn).toHaveBeenCalled();
	})
	it('lte', function(){
		var fn=jasmine.createSpy('foo');
		W(model).on(WE.ALTERED, 'code').lte(10).watch(fn);
		W(model).alter('code', 11);
		expect(fn).not.toHaveBeenCalled();
		
		W(model).alter('code', 10);
		expect(fn).toHaveBeenCalled();
	})
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
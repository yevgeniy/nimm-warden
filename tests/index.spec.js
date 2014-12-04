var model;
var W = require('../index').Warden;
var WardenEvent = require('../index').WardenEvent;
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

            it('if there is an old subject at the src, then old subject should not longer be a ward of the src', function () {
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
		describe('observe...', function() {
			it('creating observable', function() {
				var fn = jasmine.createSpy('fn');
				var s1 = W(model).child('Options').on('spliced')
				var s2 = W(model).child('Options').all().at('Code').on('altered')
				var s3 = W(model).descendant('AloneObject').on('altered')
				var obs = W.observe(
					[	s1,s2, s3 ]
					, fn
				);
				
				expect(fn).toHaveBeenCalled();

				expect(fn.calls.mostRecent().args[0].get()).toBe(s1.get())
				expect(fn.calls.mostRecent().args[1].get()).toBe(s2.get())
				expect(fn.calls.mostRecent().args[2].get()).toBe(s3.get())
				expect(fn.calls.count()).toBe(1);
				
				W(model).child('Options').push(123);
				expect(fn.calls.mostRecent().args[0].get()).toBe(s1.get())
				expect(fn.calls.mostRecent().args[1].get()).toBe(s2.get())
				expect(fn.calls.mostRecent().args[2].get()).toBe(s3.get())
				expect(fn.calls.count()).toBe(2);
			});
			it('destroy observable', function() {
				var fn = jasmine.createSpy('fn');
				var obs = W.observe(
					[	W(model).child('Options').on('spliced'),
						W(model).child('Options').all().at('Code').on('altered'),
						W(model).descendant('AloneObject').on('altered') ]
					, fn
				);
				
				expect(fn).toHaveBeenCalled();
				expect(fn.calls.count()).toBe(1);
				
				obs.destroy();
				W(model).child('Options').push(123);
				expect(fn.calls.count()).toBe(1);
			})
		})
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
        it('watch', function () {
			var w = W(model);
			var fn = function () { };
		
			w.watch('altered', fn);
			
			expect(model.__ward__.com[0]._event).toBe('altered');
			expect(model.__ward__.com[0]).toBe(w);
			expect(model.__ward__.com[0]._notify).toBe(fn);
		});
		it('destroy watch', function() {
			var w = W(model);
			var fn = jasmine.createSpy('foo');
		
			var obj = w.watch('altered', fn);
			obj.destroy();
			
			W(model).alter('foo', 123123123);
			
			expect(fn).not.toHaveBeenCalled();
		})
		it('ignore', function () {
			var w = W(model);
			var fn1 = function () { }
			var fn2 = function () { }
			W(model).at('mook').watch('altered', fn1);
			W(model).child('boo').at('foo').watch('altered', fn2);
			W(model).child('Options').watch('added', function () { });
		
			w.ignore(function (event, prop, fn, sel) {
				return event == 'altered' && prop == 'foo'
			});
			
			expect(model.__ward__.com[0]._event).toBe('altered')
			expect(model.__ward__.com[0].get()).toBe(w._model);
			expect(model.__ward__.com[0]._notify).toBe(fn1);

			expect(model.__ward__.com[1]._event).toBe('added')
			expect(model.__ward__.com[1].get()).toBe(model.Options);
			expect(model.__ward__.com[1]._notify.constructor).toBe(Function);

			expect(model.__ward__.com.length).toBe(2);
		});
		
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
		
        it('self', function () {
            var src = {};
			var res = W(src).self().get();
			expect(res).toBe(src);
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
			var res = W(src).brood('foo', 'moo').get();
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
			expect(w._model).toBe(model)
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
        var res = W(model).child('Options').brood(0, 'Doom', 1).get();
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
        var res = W(model).brood('Options', 1, 'AloneObject').ancestors().getAll();
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
    it('and can concat statements', function () {
        var res = W(model).child('Options').all()
            .and().descendant('AloneObject')
			.getAll();

        expect(res[0]).toBe(model.Options[0]);
        expect(res[1]).toBe(model.Options[1]);
        expect(res[2]).toBe(model.Options[1].AloneObject);
        expect(res.length).toBe(3);
    })
});
describe('events..', function () {
    describe('alter...', function () {
        it('ev fn', function () {
            var fn = jasmine.createSpy('fn');
            var fn2 = jasmine.createSpy('fn2');
            W(model).watch('altered', fn);
            W(model).watch('altered', fn2);

            W(model).alter('foo',123);
            expect(fn).toHaveBeenCalled();
            expect(fn2).toHaveBeenCalled();
        });
        it('ev sel fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).child('Options').all().watch('altered', fn)

            W(model).brood('Options', 1).alter('Code',4);
            expect(fn).toHaveBeenCalled();
        });
        it('ev prop fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).at('foo').watch('altered', fn)

            W(model).alter('foo',4);
            expect(fn).toHaveBeenCalled();
        });
        it('ev prop sel fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).child('Options').all().at('foo').watch('altered', fn)

            W(model).brood('Options', 1).alter('boo',4);
            expect(fn).not.toHaveBeenCalled();
            W(model).brood('Options', 0).alter('foo',4);
            expect(fn).toHaveBeenCalled();
        });
		
        it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).descendant(1).at('foo').watch('altered', fn);

            W(model).child('Options').all().alter('foo',444);

            expect(fn.calls.mostRecent().args[0].event).toBe('altered');
            expect(fn.calls.mostRecent().args[0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[0].val).toBe(444);

            expect(fn.calls.mostRecent().args[1][0].from).toBe(undefined);
            expect(fn.calls.mostRecent().args[1][0].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][0].target).toBe(model.Options[0]);
            expect(fn.calls.mostRecent().args[1][0].to).toBe(444);

            expect(fn.calls.mostRecent().args[1][1].from).toBe('hello world');
            expect(fn.calls.mostRecent().args[1][1].prop).toBe('foo');
            expect(fn.calls.mostRecent().args[1][1].target).toBe(model.Options[1]);
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
        it('ev fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch('added', fn);

            W(model).push([123, 234]);
            expect(fn).toHaveBeenCalled();
        });
        it('ev sel fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).descendant('Options').watch('added', fn)

            W(model).brood(0, 'Options').push({});
            expect(fn).toHaveBeenCalled();
        });
        
        it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch('added', fn);

            var newobj = {}
            W(model).push([newobj, 'hello feemer']);

            expect(fn.calls.mostRecent().args[0].event).toBe('added');
            expect(fn.calls.mostRecent().args[0].add[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[0].add[1]).toBe('hello feemer');

            expect(fn.calls.mostRecent().args[1][0].added[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[1][0].added[1]).toBe('hello feemer');
            expect(fn.calls.mostRecent().args[1][0].at).toBe(2);
            expect(fn.calls.mostRecent().args[1][0].target).toBe(model);

        });
    });
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
        it('ev fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch('spliced', fn);

            W(model).splice(0, 1, [123, 234]);
            expect(fn).toHaveBeenCalled();
        });
        it('ev sel fn', function () {
            var fn = jasmine.createSpy('fn');
            W(model).descendant('Options').watch('spliced', fn)

            W(model).brood(0, 'Options').splice(0,0,'foo bar was');
            expect(fn).toHaveBeenCalled();
        });
        it('exposes context', function () {
            var fn = jasmine.createSpy('fn');
            W(model).watch('spliced', fn);

            var newobj = {};
            W(model).splice(1,1, [newobj, 'hello feemer']);

            expect(fn.calls.mostRecent().args[0].event).toBe('spliced');
            expect(fn.calls.mostRecent().args[0].add[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[0].add[1]).toBe('hello feemer');
            expect(fn.calls.mostRecent().args[0].cut).toBe(1);
            expect(fn.calls.mostRecent().args[0].start).toBe(1);

            expect(fn.calls.mostRecent().args[1][0].added[0]).toBe(newobj);
            expect(fn.calls.mostRecent().args[1][0].added[1]).toBe('hello feemer');
            expect(fn.calls.mostRecent().args[1][0].at).toBe(1);
            expect(fn.calls.mostRecent().args[1][0].target).toBe(model);
        });
    });
});
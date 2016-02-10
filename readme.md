# Nimm Warden

Let Warden watch your model.  When something changes it will let you know:
```
var model = {
	cartItems:[
		{id:1, quantity:1},
		{id:2, quantity:2},
		{id:3, quantity:3},
	]
};
Warden(model).child('cartItems').all().watch('quantity', function(e,d) {
	//e.event is 'set'
	//e.val is 123
	
	//d[0].target is model.cartItems[0]
	//d[0].prop is 'quantity'
	//d[0].from is 1
	//d[0].to is 123
	
	//d[1].target is model.cartItems[1]
	//d[1].prop is 'quantity'
	//d[1].from is 2
	//d[1].to is 123
	
});

Warden(model)
	.child('cartItems')
	.all()
	.where(function(v){
		return v.id==1 || v.id==2;
	})
	.alter('quantity', 123);
```
------------
Warden works by placing back references on objects (so nothing lower than IE8) thus warden has to 'see' an object in a model before it can audit it.  Warden changes very little on the model -- you can still say `model.cartItems` and get the same ref to the array, however to ensure all things work correctly allow Warden to handle reading, writing, pushing, and splicing the model.

------------------------

There are 4 kinds of public warden methods:

__Selectors__ -- `Warden(model)` returns a warden selector.  Then selector methods `eg: child(), where(), ancestors()` will drill down to an object(s)/value(s) in a model.  Selectors merely setup access, what is to be done with that target is defined by ___terminators___ or ___watchers___.  Selectors return the same selector object so in this example
```
var w = Warden(model);
var a = w.child('foo');
var b = w.child('boo');

```
...all variables (w, a, and b) will direct access to `model.foo.boo`.

__Terminators__ -- Terminators `eg: getAll(), each(), alter(), clone()` do something with the selector or value(s) accessed by the selector.

__Watchers__ -- Watch a selector and invoke a handler when an object matching a selector was changed.  In this example
```
W(model).brood('cart.cartItems').watch(function() {
	console.log('hello world');
})
```
...hello world will print when `cart.cartItems` property changes.  If it's an array it will also trigger when anything is added or removed from it.

__Auditors__ -- Auditors `eg: at(), is(), gt()` audit the watched selector before notifying a watcher.  Thus only purpose for auditors is to be used in conjunction with a __watcher__.  So in this example
```
W(model).child('shipment').at('quantity').watch(function(){
	console.log('hello world');
})
```
...hello world will be printed only when property `shipment.quantity` is changed (set or altered).

--------------
### PUBLIC METHODS ###
`var warden = Warden(model)`

___selectors___:
- `warden.self()` -- returns identity of the current selector.  Mostly a semantic method `warden.child('foo').or().self().getAll()` will return `[model.foo, model]`.  Note `self()` in this example can be totally ignored and `getAll()` will return the same result.
- `warden.child(prop)` -- setup access to a property in a model.  So `warden.child('foo').child('boo').get()` will return `model.foo.boo`.
- `warden.brood(props)` -- a proxy to multiple `child()` calls.  So `warden.brood('foo.boo')` is same as `warden.child('foo').child('boo')`.
- `warden.descendant(prop)` -- does a deapth first search on a model and sets up access to all objects/variables matching the given property name.  Needless to say this can cause an infinite loop.
- `warden.all()` -- give access to all the properties at a current selector.  If an array this will ittirate through an index or by property if an object.  `all()` can be tricky given the following example:
```
var model = {
  options:[1,2,3]
};

// WRONG!
var res = Warden(model).child('options').where(function(v){ return v==1} ); 

// RIGHT!
var res = Warden(model).child('options').all().where(function(v){return v==1});
```
- `warden.parent()` -- setup access to a parent on a current selector.
- `warden.ancestors()` -- setup access to all parents on a current selector untill it hits a 'root' (can's see any more parents).  Could possibly cause an infinite loop.
- `warden.where(filter)` -- setup access to all object/variables if supplied filter returns a truthy value.  Currently, 2 arguments are exposed to the function `function (value, index)` where first value is an object in a current selector and second value is an index in a sequence (in a selector not a parent). So:
```
var model={
  foo:[1,2,3],
  boo:[4,5,6]
}
var res = Warden(model)
  .child('foo')
  .or().child('boo')
  .where(function(x, i) {
  	return i==0;
  })
  .getAll();
```
...will return `[1]` not `[1,4]`.
- `warden.or()` -- compound selector access.  Everytime `or()` is called this places selector access back at the start (including self).
```
var model={
  foo:{
    boo:{}
  }
}
var foo = Warden(model).child('foo').get();
var res = Warden(foo)
  .child('boo')
  .or().parent()
  .getAll(); // res will be [model.foo.boo, model]
  
var res2 = Warden(foo)
  .child('boo')
  .or()
  .getAll() // res2 will be [model.foo.boo, model.foo]
```

___terminators___:
- `warden.copy()` -- returns a copy of the selector so if `var w = Warden(model); var z = w.copy()` calling `z.child('foo')` will not effect selector signiture of w.
- `warden.get()` -- returns the first object/value accessed at a selector.
- `warden.getAll()` -- returns all the objects/values accessed at a selector.
- `warden.alter(prop, newvalue)` -- sets the property on all objects accessed at a selector to new value.
```
var model={
  options=[ { foo:'old-value' }, 2, 34 ],
  foo:'old-value'
}

Warden(model).brood('options.0').or().self().alter('foo', 'new-value');
// model.options[0].foo is 'new-value'
// model.foo is 'new-value'
```
`alter(), push(), and splice()` return an 'activity' object.  Warden may have been watching the propery which was changed, the delegate executed at change, may have returned a value of its own.  These 'reactions' can be exposed through an activity object.
```
var model={
  options=[ { foo:'old-value' }, 2, 34 ],
  foo:'old-value'
}

var c=0;
Warden(model).child('options').all().or().self().watch(WardenEvent.ALTERED, 'foo', function(e,d) {
  return ++c;
})

Warden(model).brood('options.0').or().self().alter('foo', 'new-value')
  .response(function(a,b) {
    //a is 1
    //b is 2
  });
```
`WardenEvent.ALTERED` is triggered by the model if a property changed.
- `warden.splice(start, cut)`
- `warden.splice(start, cut, add)` -- splices all arrays accessed at a selector (target objects must implement `splice`).  Add may be a single value or an array of values.  `WardenEvent.ADDED` is triggered by the model if any objects were added, `WardenEvent.REMOVED`. is triggered if objects were removed.  `WardenEvent.SPLICED` is triggered if objects were removed or added.  Similar to `alter()`, `splice()` returns an 'activity' object.
- `warden.push(add)` -- pushes values to all arrays accessed at a selector (target objects must implement `push`).  Add may be a value or an array of values.  `WardenEvent.ADDED` and `WardenEvent.SPLICED` are triggered by the model if any objects were added.  Similar to `alter()`, `push()` returns an 'activity' object.
- `warden.each(process)` -- At all objects accessed by the selector run a given process ittirating by index if array or by property if an object.
- `warden.clone()` -- clone the first object access at a selector returning a new model cleaned up from all the Warden backlinking.
- `warden.watch()`
- `warden.watch(fn)`
- `warden.watch(event, fn)`
- `warden.watch(event, prop, fn)` -- activates auditors effectively watching the model.  Currently there are 3 auditors:  ___event___, ___property___, ___notifier___.  Events come from `WardenEvent`, currently valid events are `WardenEvent.ALTERED, WardenEvent.ADDED, WardenEvent.REMOVED, WardenEvent.SPLICED`.  Property is optional and can be included if event is `WardenEvent.ALTERED`.  This tells Warden to call the notifier only if the altered property matches the poperty (otherwise it will call the notifier if any object property changes).  Notifier is a function that Warden will call if effect signiture matches the event and the property.

Two variables are exposed to the notifier ___signature___ and ___changedata___.  Signature describes the process which effected the change -- basically this simply shows the parameters which were used either to alter, splice, or push.  Change data describes the changes which took place.  Changedata is always an array, an entry per object changed.  Signature and changedata objects change based on events (as expected) to adequately describe what happened.

`watch()` returns an instance object that can be used (as one of the ways) to destroy that instance of a watch.
```
var watchInst = Warden(model).on(WardenEvent.ALTERED, 'foo', function(e,d) {

});
watchInst.destroy();
```
- `warden.ignore(filter)` -- parse all objects accessed at a selector and ignore those watching selectors at which filter returned a truthy value.  Filter function is given these values: ___event___ of a watching selector, ___prop___, ___notifier___, and the ___selector___ itself.
```
Warden(model).on(WardenEvent.ALTERED, 'foo', function(){} );

Warden(model).ignore(function(ev, prop, fn, sel) {
  return ev==WardenEvent.ALTERED && prop=='foo';
});
```
A very important ward of caution.  Watching selectors are stored on the model so when ignoring selector access must expose that same model to work correctly.
```
Warden(model).child('options').watch(WardenEvent.ADDED, function(){});

//WRONG! since the watching selector is on model not model.options.
Warden(model).child('options').ignore(function(){})

//RIGHT!
Warden(model).ignore(function(){})
```

___auditors___:
- `warden.on(event)`
- `warden.on(fn)`
- `warden.on(event, prop)`
- `warden.on(event, fn)`
- `warden.on(event, prop, fn)` -- attaches auditors to a selector.  Events found on `WardenEvent`
- `warden.at(prop)` -- attach prop auditor to a selector.
- `warden.notify(fn)` -- attach notifier function to a selector.
- `warden.eq(obj)` -- call event handler only if new altered value matches obj.
```
	// fn will be called only if name is set to 'foo'.
	Warden(model).on(WE.ALTERED, 'name').eq('foo').watch(fn);
```
- `warden.gt(int) -- call event handler only if new altered value is greater than int.
- `warden.lt(int) -- call event handler only if new altered value is less than int.
- `warden.gte(int) -- call event handler only if new altered value is greater than or equal to int.
- `warden.lte(int) -- call event handler only if new altered value is less than or equal to int.
- `warden.is(fn) -- call event handler only if supplyed fn returns true (new value value is exposed to fn).
```
	// fn will be called only if name is set to 'foo'.
	Warden(model).is(function(newname){
		return newname=='foo';
	}).watch(WE.ALTERED, 'name', fn);
	// ...note that function call order for auditors is not important.
```
- `warden.key(str) -- ensures that only a single selector by this key can be watched on a model.
```
	Warden(model).key('foo').watch(WardenEvent.ALTERED, 'name', fn1)
	Warden(model).key('foo').watch(WardenEvent.ALTERED, 'name', fn2)
	// ...in this case the fn1 watcher was overridden by fn2 watcher
```

--------------------
##So whats the point of auditors?##

### `Warden.observe(selectors, process, async=false)` ###
Take a list of selectors with event and prop auditors attached when something changes run the process.  Always runs the process to begin with.

```
Warden.observe([
  Warden(model).child('options').all().on(WardenEvent.ALTERED, 'quantity'),
  Warden(model).child('options').all().child('deliveryMethod').on(WardenEvent.ALTERED, 'code') ]
  , function() {
    
    ...
  }
)
```
`Warden.observe()` returns an instance object which can be used to destroy the observable.
```
var obsInst = Warden.observe(...)
obsInst.destroy();
```

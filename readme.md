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
Warden(model).child('cartItems').all().watch(WardenEvent.ALTERED, 'quantity', function(e,d) {
	//e.event is 'altered'
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
Warden works by placing back references on objects (so nothing lower than IE8) thus warden has to 'see' an object in a model before it can audit it.  Warden changes very little on the model -- you can still say `model.cartItems` and get the same ref to the array, however to ensure all things work correctly allow Warden to handle reading, writing, pushing, and splicing in the model.

------------------------

There are 3 kinds of public warden methods:

__Selectors__ -- `Warden(model)` returns a warden selector.  Then selector methods `eg: child(), where(), ancestors()` will drill down to an object(s)/value(s) in a model.  Selectors merely setup access, what is to be done with that target is defined by ___terminators___ or ___auditors___.  Selectors return the same selector object so in this example
```
var w = Warden(model);
var a = w.child('foo');
var b = w.child('boo');

```
...all variables (w, a, and b) will direct access to `model.foo.boo`.

__Terminators__ -- Terminators `eg: getAll(), each(), alter(), clone()` do something with the selector or value(s) accessed by the selector.

__Auditors__ -- Auditors `eg: on(), at()` embed auditable expectations to a selector.  The only purpose for auditors is to be used in conjunction with `watch()`.  In other words, `watch()` will finally activate the autitors and effectively start auditing the model.

--------------
### PUBLIC METHODS ###
`var warden = Warden(model)`

___selectors___:
- `warden.self()` -- returns identity of the current selector.  Mostly a semantic method `warden.child('foo').and().self().getAll()` will return `[model.foo, model]`.  Note `self()` in this example can be totally ignored and `getAll()` will return the same result.
- `warden.child({prop})` -- setup access to a property in a model.  So `warden.child('foo').child('boo').get()` will return `model.foo.boo`.
- `warden.brood(...{prop})` -- a proxy to multiple `child()` calls.  So `warden.brood('foo','boo')` is same as `warden.child('foo').child('boo')`.
- `warden.descendant({prop})` -- does a deapth first search on a model and sets up access to all objects/variables matching the given property name.  Needless to say this can cause an infinite loop.
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
- `warden.where({filter})` -- setup access to all object/variables if supplied filter returns a truthy value.  Currently, 2 arguments are exposed to the function `function ({object|value}, {int})` where first value is an object in a current selector and second value is an index in a sequence (in a selector not a parent). So:
```
var model={
  foo:[1,2,3],
  boo:[4,5,6]
}
var res = Warden(model)
  .child('foo')
  .and().child('boo')
  .where(function(x, i) {
  	return i==0;
  })
  .getAll();
```
...will return `[1]` not `[1,4]`.
- `warden.and()` -- compound selector access.  Everytime `and()` is called this places selector access back at the start (including self).
```
var model={
  foo:{
    boo:{}
  }
}
var foo = Warden(model).child('foo').get();
var res = Warden(foo)
  .child('boo')
  .and().parent()
  .getAll(); // res will be [model.foo.boo, model]
  
var res2 = Warden(foo)
  .child('boo')
  .and()
  .getAll() // res2 will be [model.foo.boo, model.foo]
```

___terminators___:
- `warden.copy()` -- returns a copy of the selector so if `var w = Warden(model); var z = w.copy()` calling `z.child('foo')` will not effect selector signiture of w.
- `warden.get()` -- returns the first object/value accessed at a selector.
- `warden.getAll()` -- returns all the objects/values accessed at a selector.
- `warden.alter({prop}, {newvalue})` -- sets the property on all objects accessed at a selector to new value.
```
var model={
  options=[ { foo:'old-value' }, 2, 34 ],
  foo:'old-value'
}

Warden(model).brood('options','0').and().self().alter('foo', 'new-value');
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
Warden(model).child('options').all().and().self().watch(WardenEvent.ALTERED, 'foo', function(e,d) {
  return ++c;
})

Warden(model).brood('options','0').and().self().alter('foo', 'new-value')
  .response(function(a,b) {
    //a is 1
    //b is 2
  });
```
`WardenEvent.ALTERED` is triggered by the model if a property changed.
- `warden.splice({start}, {cut}, {add | [adds]})` -- splices all arrays accessed at a selector (target objects must implement `splice`).  `WardenEvent.ADDED` is triggered by the model if any objects were added, `WardenEvent.REMOVED`. is triggered if objects were removed.  `WardenEvent.SPLICED` is triggered if objects were removed or added.  Similar to `alter()`, `splice()` returns an 'activity' object.
- `warden.push({add | [adds]})` -- pushes values to all arrays accessed at a selector (target objects must implement `push`).  `WardenEvent.ADDED` and `WardenEvent.SPLICED` are triggered by the model if any objects were added.  Similar to `alter()`, `push()` returns an 'activity' object.
- `warden.each({process})` -- At all objects accessed by the selector run a given process ittirating by index if array or by property if an object.
- `warden.clone()` -- clone the first object access at a selector returning a new model cleaned up from all the Warden backlinking.
- `warden.watch()`
- `warden.watch({fn})`
- `warden.watch({event}, {fn})`
- `warden.watch({event}, {prop}, {fn})` -- activates auditors effectively watching the model.  Currently there are 3 auditors:  ___event___, ___property___, ___notifier___.  Events come from `WardenEvent`, currently valid events are `WardenEvent.ALTERED, WardenEvent.ADDED, WardenEvent.REMOVED, WardenEvent.SPLICED`.  Property is optional and can be included if event is `WardenEvent.ALTERED`.  This tells Warden to call the notifier only if the altered property matches the poperty (otherwise it will call the notifier if any object property changes).  Notifier is a function that Warden will call if effect signiture matches the event and the property.

Two variables are exposed to the notifier ___signature___ and ___changedata___.  Signature describes the process which effected the change -- basically this simply shows the parameters which were used either to alter, splice, or push.  Change data describes the changes which took place.  Changedata is always an array, an entry per object changed.  Signature and changedata objects change based on events (as expected) to adequately describe what happened.


___auditors___:
- `warden.on({event}, {prop | fn}, {fn})` -- attaches auditors to a selector.  Events found on `WardenEvent`
- `warden.at({prop})` -- attach prop autitor to a selector.
- `warden.notify({fn})` -- attach notifier function to a selector.

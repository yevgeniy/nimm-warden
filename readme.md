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
- `warden.child({string})` -- setup access to a property in a model.  So `warden.child('foo').child('boo').get()` will return `model.foo.boo`.
- `warden.brood(...{string})` -- a proxy to multiple `child()` calls.  So `warden.brood('foo','boo')` is same as `warden.child('foo').child('boo')`.
- `warden.descendant({string})` -- does a deapth first search on a model and sets up access to all objects/variables matching the given property name.  Needless to say this can cause an infinite loop.
- `warden.all()` -- give access to all the properties at a current selector.  If an array this will ittirate through an index or by property if an object.  All can be tricky given the following example:
```
var model = [1,2,3];
var res = Warden(model).get();
```
...this will return an array such that `res === model`.  However:
```
var model = [1,2,{foo:123}];
var res = Warden(model).all().get();
```
...will return the first member in a model `1` (since `get()` return only the first selected result.  `getAll()` would have returned all the results).
- `warden.parent()` -- setup access to a parent on a current selector.
- `warden.ancestors()` -- setup access to all parents on a current selector untill it hits a 'root' (can's see any more parents).  Could possibly cause an infinite loop.
- `warden.where({fn})` -- setup access to all object/variables if supplied function returns a truthy value.  Currently, 2 arguments are exposed to the function `function ({object|value}, {int})` where first value is an object in a current selector and second value is an index in a sequence (in a selector not a parent). So:
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


___terminators___:
- `warden.copy()` -- returns a copy of the selector so if `var w = Warden(model); var z = w.copy()` calling `z.child('foo')` will not effect selector signiture of w.

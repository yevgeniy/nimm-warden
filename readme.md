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

- `warden.copy()` -- returns a copy of the selector so if `var w = Warden(model); var z = w.copy()` calling `z.child('foo')` will not effect selector signiture of w.

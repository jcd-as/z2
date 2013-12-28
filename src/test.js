// z2 test code
//

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", "scene", "view", "ecs", "loader", "statemachine"] );

// create a scene
var scene = new z2.Scene( 1000, 1000 );
// create a view
var view = new z2.View( scene, WIDTH, HEIGHT, z2.VIEW_MODE_TIGHT, 500, 500 );

// create some test components
var pos = z2.createComponentFactory( {x: 0, y: 0} ).create( {y:1000, z:1} );
console.log( "pos mask: " + pos.mask.key );
console.log( "pos: x = " + pos.x + ", y = " + pos.y + ", z = ", pos.z );
var vf = z2.createComponentFactory( {x: 0, y: 0} );
var vel = vf.create( {y:1, x:1} );
console.log( "vel mask: " + vel.mask.key );

// get the ecs manager
var mgr = z2.manager.get();

// create a test entity
var e = mgr.createEntity( [pos, vf] );
console.log( "e mask: " + e.mask.key );

// create a test system that operates on this kind of entity
var s = new z2.System( [pos, vel], 
{
	init: function()
	{
		console.log( "s.init called" );
	},
	onStart: function()
	{
		console.log( "s.onStart called" );
	},
	update: function( e )
	{
		console.log( "s.update called with: " + e.id );
	},
	onEnd: function()
	{
		console.log( "s.onEnd called" );
	},
} );
mgr.addSystem( s );

// create a test system that doesn't operate on this kind of entity
var unk = z2.createComponentFactory().create();
console.log( "unk mask: " + unk.mask.key );
var s2 = new z2.System( [pos, vf, unk], { update: function(e) { console.log( "s2.update called with: " + e.id ); } } );
mgr.addSystem( s2 );

// create another entity
var e2 = mgr.createEntity( [pos, vel, unk] );
console.log( "e2 mask: " + e2.mask.key );

// have the ecs manager simulate a frame
mgr.update();


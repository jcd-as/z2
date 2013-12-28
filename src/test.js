// z2 test code
// TODO:
// - add a canvas
// - render: polygon, image, sprite
// - input 
//

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", "scene", "view", "ecs", "loader", "statemachine", "2d"] );

// create a canvas
var canvas = document.createElement( 'canvas' );
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild( canvas );

// load an image
z2.loader.queueAsset( 'logo', 'logo.png' );
//z2.loader.load( function(){ console.log( "loaded logo.png" ); } );
z2.loader.load( start );

// create a scene
var scene = new z2.Scene( 1000, 1000 );

// create a view
var view = new z2.View( scene, WIDTH, HEIGHT, z2.VIEW_MODE_TIGHT, 500, 500 );

// get the ecs manager
var mgr = z2.manager.get();

function start()
{
	// create some test components
	var pos = z2.createComponentFactory( {x: 0, y: 0} ).create( {y:1000, z:1} );
	console.log( "pos mask: " + pos.mask.key );
	console.log( "pos: x = " + pos.x + ", y = " + pos.y + ", z = ", pos.z );
	var vf = z2.createComponentFactory( {x: 0, y: 0} );
	var vel = vf.create( {y:1, x:1} );
	console.log( "vel mask: " + vel.mask.key );

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

	// create a renderable image Entity
	var img = z2.loader.getAsset( 'logo' );
	var imgc = z2.imageFactory.create( {img:img, width:512, height:384} );
	var imge = mgr.createEntity( [z2.renderableFactory, imgc] );
	console.log( "imge mask: " + imge.mask.key );
	// create rendering system
	var rs = z2.createRenderingSystem( canvas, true );
	console.log( "Rendering sys mask: " + rs.mask.key );
	mgr.addSystem( rs );

	// TODO: requestAnimationFrame

	// have the ecs manager simulate a frame
	mgr.update();
}

// TODO: requestAnimationFrame



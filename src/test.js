// z2 test code
// TODO:
// - collision detection (separated axis theorem)
//

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", "scene", "view", "ecs", "loader", "input", "statemachine", "2d"] );

// create a canvas
var canvas = document.createElement( 'canvas' );
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild( canvas );

// get a 2d context for the canvas
var context = canvas.getContext( '2d' );
var context = canvas.getContext( '2d' );
if( !context )
	throw new Error( "No 2d canvas context. Unable to continue." );
context.globalAlpha = 1;


// load an image
z2.loader.queueAsset( 'logo', 'logo.png' );
z2.loader.queueAsset( 'man', 'stylized.png' );
//z2.loader.load( function(){ console.log( "loaded logo.png" ); } );
z2.loader.load( start );

// create a scene
var scene = new z2.Scene( 1000, 1000 );

// create a view
var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_NONE, 500, 500 );
//var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_TIGHT, 500, 500 );
//view.x = 256;
//view.x = 400;
//view.y = -256;
//view.rotation = z2.d2r(-4);
//view.sx = 0.5;
//view.sy = 0.5;


// get the ecs manager
var mgr = z2.manager.get();

// create a "player control" component
var player = z2.createComponentFactory();
// placeholder for sprite entity
var spre;
// create an input system
var vel_sw_time = 0;
var sprv = z2.velocityFactory.create( {x: 0, y: 0} );
//var input_sys = new z2.System( [z2.velocityFactory, player],
var input_sys = new z2.System( [player],
{
	init: function()
	{
		console.log( "input: init called" );
		z2.kbd.start();
		z2.kbd.addKey( z2.kbd.UP );
		z2.kbd.addKey( z2.kbd.DOWN );
		z2.kbd.addKey( z2.kbd.LEFT );
		z2.kbd.addKey( z2.kbd.RIGHT );
		z2.kbd.addKey( z2.kbd.SPACEBAR );
	},
	update: function( e, dt )
	{
		console.log( "input: update called" );

		// get the velocity component
		var vc = e.getComponent( z2.velocityFactory.mask );

		if( z2.kbd.isDown( z2.kbd.SPACEBAR ) )
		{
			// only allow turning velocity off once every 500 ms
			var t = z2.time.now();
			if( t - vel_sw_time > 500 )
			{
				vel_sw_time = t;
				if( vc )
				{
					// turn vel off
					vel_on = false;
					spre.removeComponent( z2.velocityFactory.mask );
				}
				else
				{
					// turn vel on
					vel_on = true;
					spre.addComponent( sprv );
				}
			}
		}

		if( vc )
		{
			// check keys
			if( z2.kbd.isDown( z2.kbd.UP ) )
				vc.y = -100;
			else if( z2.kbd.isDown( z2.kbd.DOWN ) )
				vc.y = 100;
			else
				vc.y = 0;
			if( z2.kbd.isDown( z2.kbd.LEFT ) )
				vc.x = -100;
			else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
				vc.x = 100;
			else vc.x = 0;
		}
	}
} );

mgr.addSystem( input_sys );

// called after assets are loaded
function start()
{
	// create a renderable image Entity
	var img = z2.loader.getAsset( 'logo' );
	var imgc = z2.imageFactory.create( {img:img} );
	var imgx = z2.transformFactory.create();
//	var imgp = z2.positionFactory.create( {x: 100, y: 0} );
	var imgp = z2.positionFactory.create( {x: 500, y: 500} );
	var imgr = z2.rotationFactory.create( {theta: 0} );
//	var imgr = z2.rotationFactory.create( {theta: z2.d2r(-4)} );
//	var imgr = z2.rotationFactory.create( {theta: z2.d2r(45)} );
	var imgs = z2.scaleFactory.create( {sx: 1, sy: 1} );
	var imgsz = z2.sizeFactory.create( {width: 512, height: 384} );
//	var imgcc = z2.centerFactory.create( {cx: 0.25, cy: 0.5} );
	var imgcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
	var imgv = z2.velocityFactory.create( {x: 0, y: 0} );
	var imgxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
//	var imge = mgr.createEntity( [z2.renderableFactory, imgxf, imgp, imgr, imgsz, imgs, imgcc, imgc, imgv, player] );
	var imge = mgr.createEntity( [z2.renderableFactory, imgxf, imgp, imgr, imgsz, imgs, imgcc, imgc, imgv] );
	console.log( "imge mask: " + imge.mask.key );

	// create a (random) polygon (triangle)
	var vertices = [];
	for( var i = 0; i < 3; i++ )
	{
		vertices.push( Math.random() * WIDTH - WIDTH/2, Math.random() * HEIGHT - HEIGHT/2 );
	}
	var polyc = z2.polygonFactory.create( {vertices: vertices} );
	var polyp = z2.positionFactory.create( {x: 500, y: 500} );
	var polysz = z2.sizeFactory.create( {width: 100, height: 100} );
	var polyxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
	var polyf = z2.fillFactory.create( {fill:'rgba( 255, 0, 0, 0.5 )'} );
	var polye = mgr.createEntity( [z2.renderableFactory, polyf, polyxf, polyc, polyp, polysz] );

	// create an (animated) sprite
	var s_img = z2.loader.getAsset( 'man' );
	var anims = new z2.AnimationSet();
	anims.add( 'walk', [[0, 250], [1, 250]] );
	var sprc = z2.spriteFactory.create( {img:s_img, animations:anims} );
	var sprx = z2.transformFactory.create();
	var sprp = z2.positionFactory.create( {x: 500, y: 500} );
	var sprpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: scene.width-16, miny: 32, maxy: scene.height-32} );
	var sprr = z2.rotationFactory.create( {theta: 0} );
//	var sprr = z2.rotationFactory.create( {theta: z2.d2r(10)} );
	var sprs = z2.scaleFactory.create( {sx: 1, sy: 1} );
	var sprsz = z2.sizeFactory.create( {width: 64, height: 64} );
	var sprcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
//	var sprv = z2.velocityFactory.create( {x: 0, y: 0} );
	var sprxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
	spre = mgr.createEntity( [z2.renderableFactory, sprxf, sprp, sprpc, sprr, sprsz, sprs, sprcc, sprc, sprv, player] );
	anims.play( 'walk' );

	// follow this sprite
	view.target = sprp;
	view.follow_mode = z2.FOLLOW_MODE_TIGHT;
	
	// create a movement system
	var ms = z2.createMovementSystem();
	mgr.addSystem( ms );

	// create the transform system
	var xf = z2.createTransformSystem( view, context );
	mgr.addSystem( xf );

	// create rendering system
	var rs = z2.createRenderingSystem( canvas, true );
	console.log( "Rendering sys mask: " + rs.mask.key );
	mgr.addSystem( rs );

	// start the main loop
	requestAnimationFrame( update );
}

var pt = 0;

function update( dt )
{
	if( pt === 0 )
		pt = dt;
	
	// update the ecs system
	mgr.update( dt - pt );

	// next frame
	pt = dt;
	requestAnimationFrame( update );
}


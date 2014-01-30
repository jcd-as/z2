// z2 test code
// TODO:
// - 
//

"use strict";

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", /*"scene",*/ "view", "ecs", "loader", "input", "statemachine", "2d", "collision", "tilemap", "tiledscene"] );

// create a canvas
var canvas = z2.createCanvas( WIDTH, HEIGHT, true );

// get a 2d context for the canvas
//var context = canvas.getContext( '2d' );
//if( !context )
//	throw new Error( "No 2d canvas context. Unable to continue." );
//context.globalAlpha = 1;


// load an image
z2.loader.queueAsset( 'logo', 'logo.png' );
z2.loader.queueAsset( 'man', 'stylized.png' );
//z2.loader.queueAsset( 'tiles', 'tiles.png' );
z2.loader.queueAsset( 'level', 'test.json', 'tiled' );
z2.loader.load( start );

// create a scene
//var scene = new z2.Scene( 1024, 1024 );
//
//// create a view
//var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_NONE, 512, 512 );
//view.x = 256;
//view.x = 400;
//view.y = -256;
//view.rotation = z2.math.d2r(10);
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
var vel_on;
var sprv = z2.velocityFactory.create( {x: 0, y: 0} );
var input_sys = new z2.System( [player],
{
	init: function()
	{
		z2.kbd.start();
		z2.kbd.addKey( z2.kbd.UP );
		z2.kbd.addKey( z2.kbd.DOWN );
		z2.kbd.addKey( z2.kbd.LEFT );
		z2.kbd.addKey( z2.kbd.RIGHT );
		z2.kbd.addKey( z2.kbd.SPACEBAR );
	},
	update: function( e, dt )
	{
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

			// top-down 
//			var vel_inc = 100;
//			if( z2.kbd.isDown( z2.kbd.UP ) )
//				vc.y = -vel_inc;
//			else if( z2.kbd.isDown( z2.kbd.DOWN ) )
//				vc.y = vel_inc;
//			else
//				vc.y = 0;
//			if( z2.kbd.isDown( z2.kbd.LEFT ) )
//				vc.x = -vel_inc;
//			else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
//				vc.x = vel_inc;
//			else vc.x = 0;
			// side-scroller
			var h_vel_inc = 100;
			var v_vel_inc = 250;
			// TODO: only jump when standing on 'ground'
			if( z2.kbd.isDown( z2.kbd.UP ) )
				vc.y = -v_vel_inc;
//			else
//				vc.y = 0;
			if( z2.kbd.isDown( z2.kbd.LEFT ) )
				vc.x = -h_vel_inc;
			else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
				vc.x = h_vel_inc;
			else vc.x = 0;
		}
	}
} );

mgr.addSystem( input_sys );


// called after assets are loaded
function start()
{
	// TODO: impl
	// create a Tiled map scene
	var json = z2.loader.getAsset( 'level' );
//	var scene = new z2.TiledScene( json, WIDTH, HEIGHT );
	var scene = new z2.TiledScene();
	// create a view on the scene
	var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_NONE, 512, 512 );

	// create rendering system
	var force_canvas = false;
	var rs = z2.createRenderingSystem( canvas, view, force_canvas );

	scene.load( json, view );

	scene.map.start( mgr );

	scene.stage.addChild( view.camera_doc );

	// create a collision map
	// (for 50-layer perf test:)
//	var collisionMap = z2.buildCollisionMap( scene.map.layers[48].data, scene.map.widthInTiles, scene.map.heightInTiles, [0,1,2,3,4] );
	var collisionMap = z2.buildCollisionMap( scene.map.layers[1].data, scene.map.widthInTiles, scene.map.heightInTiles, [0,1,2,3,4] );

	// create a collision map component
	var cmc = z2.collisionMapFactory.create( {map: scene.map, data: collisionMap} );

	// create a renderable image Entity
//	var img = z2.loader.getAsset( 'logo' );
//	var imgbasetexture = new PIXI.BaseTexture( img );
//	// TODO: pass a frame to use to match the virtual size of the image 
//	// (512x384) instead of the physical size (512x512)
//	var imgtexture = new PIXI.Texture( imgbasetexture );
//	var imgsprite = new PIXI.Sprite( imgtexture );
//	view.doc.addChild( imgsprite );
//	var imgc = z2.imageFactory.create( {sprite:imgsprite} );
//	//
//	var imgp = z2.positionFactory.create( {x: 512, y: 512} );
//	var imgr = z2.rotationFactory.create( {theta: 0} );
////	var imgr = z2.rotationFactory.create( {theta: z2.d2r(-4)} );
////	var imgr = z2.rotationFactory.create( {theta: z2.d2r(45)} );
//	var imgs = z2.scaleFactory.create( {sx: 1, sy: 1} );
//	var imgsz = z2.sizeFactory.create( {width: 512, height: 384} );
////	var imgcc = z2.centerFactory.create( {cx: 0.25, cy: 0.5} );
//	var imgcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
//	var imgv = z2.velocityFactory.create( {x: 0, y: 0} );
//	var imge = mgr.createEntity( [z2.renderableFactory, imgp, imgr, imgsz, imgs, imgcc, imgc, imgv] );

	// gravity component
	var gravc = z2.gravityFactory.create( {x: 0, y: 1000} );

	// create an (animated) sprite
	var s_img = z2.loader.getAsset( 'man' );
	var anims = new z2.AnimationSet();
	anims.add( 'walk', [[0, 250], [1, 250]] );
	var sbasetexture = new PIXI.BaseTexture( s_img );
	var stexture = new PIXI.Texture( sbasetexture );
	var sprite = new PIXI.Sprite( stexture );
	view.doc.addChild( sprite );
	var sprc = z2.spriteFactory.create( {sprite:sprite, animations:anims} );
	var sprp = z2.positionFactory.create( {x: 512, y: 512} );
	var sprr = z2.rotationFactory.create( {theta: 0} );
//	var sprr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
	// reverse sprite facing
//	var sprs = z2.scaleFactory.create( {sx: -1, sy: 1} );
	var sprs = z2.scaleFactory.create( {sx: 1, sy: 1} );
	var sprsz = z2.sizeFactory.create( {width: 64, height: 64} );
	var sprcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
	var sprpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: scene.width-16, miny: 32, maxy: scene.height-32} );
	var sprbody = z2.physicsBodyFactory.create( {aabb:[-32, -16, 32, 16]} );
//	spre = mgr.createEntity( [z2.renderableFactory, player, sprv, sprp, sprr, sprsz, sprs, sprcc, sprpc, sprc] );
//	spre = mgr.createEntity( [z2.renderableFactory, cmc, sprbody, player, sprv, sprp, sprr, sprsz, sprs, sprcc, sprpc, sprc] );
	spre = mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, sprsz, sprs, sprcc, sprpc, sprc] );
	anims.play( 'walk' );


	// test for using pixi rendertexture for tilemaps:
	//////////////////////////////////////////////////
	// create a pixi rendertexture and draw our player sprite to it (as if it
	// were a tile)
//	var rt = new PIXI.RenderTexture( 128, 128 );
//	var doc = new PIXI.DisplayObjectContainer();
//	sprite.position.x = -64*8;
//	doc.addChild( sprite );
//	rt.render( doc );
//	var rts = new PIXI.Sprite( rt );
//	rts.position.x = 512;
//	rts.position.y = 512;
//	rts.anchor.x = 0.5;
//	rts.anchor.y = 0.5;
//	view.doc.addChild( rts );
	//////////////////////////////////////////////////


	// follow the sprite
	view.target = sprp;
	view.follow_mode = z2.FOLLOW_MODE_TIGHT;

	// create a movement system
	var ms = z2.createMovementSystem();

	// create a Group (component, entity & system) for transforming
//	var transformArray = [];
//	var tgc = z2.groupFactory.create( {group:transformArray} );
//	var ttgc = z2.transformGroupFactory.create();
//	var tgxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
//	var tgp = z2.positionFactory.create( {x:500, y:500} );
////	var tgr = z2.rotationFactory.create( {theta: 0} );
//	var tgr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
//	var tgpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: scene.width-16, miny: 32, maxy: scene.height-32} );
//	var tge = mgr.createEntity( [tgr, tgc, ttgc, tgp, tgxf, tgpc, sprv, player] );
//	var tgs = z2.createTransformGroupSystem( xf );
//	mgr.addSystem( tgs );

	// add our sprite to the transform group
//	transformArray.push( spre );

	// create rendering system
//	var rs = z2.createRenderingSystem( canvas, view );
	
	// add the systems (in order)
	//
	// movement system
	mgr.addSystem( ms );
	// rendering system (last system)
	mgr.addSystem( rs );

	// create a Group (component, entity & system) for rendering
//	var rgc = z2.groupFactory.create( {group:[imge, spre]} );
//	var rge = mgr.createEntity( [z2.renderGroupFactory, rgc] );
//	var rgs = z2.createGroupSystem( rs, z2.renderGroupFactory );
//	mgr.addSystem( rgs );
	// add the rendering system afterwards, so that renderables that aren't 
	// in the group render *after* the group
//	mgr.addSystem( rs );

	// start the main ecs loop
	z2.main( z2.ecsUpdate );
}


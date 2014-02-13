// z2 test code
// TODO:
// - 
//

"use strict";

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", "scene", "view", "ecs", "loader", "input", "statemachine", "2d", "collision", "tilemap", "tiledscene"] );

// create a canvas
//var canvas = document.createElement( 'canvas' );
//canvas.width = WIDTH;
//canvas.height = HEIGHT;
//document.body.appendChild( canvas );
var canvas = z2.createCanvas( WIDTH, HEIGHT, true );

// get a 2d context for the canvas
var context = canvas.getContext( '2d' );
if( !context )
	throw new Error( "No 2d canvas context. Unable to continue." );
context.globalAlpha = 1;


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
//var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_NONE, 500, 500 );
//view.x = 256;
//view.x = 400;
//view.y = -256;
//view.rotation = z2.math.d2r(-10);
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
//var input_sys = new z2.System( [z2.velocityFactory, player],
var input_sys = new z2.System( [player],
{
	init: function()
	{
//		console.log( "input: init called" );
		z2.kbd.start();
		z2.kbd.addKey( z2.kbd.UP );
		z2.kbd.addKey( z2.kbd.DOWN );
		z2.kbd.addKey( z2.kbd.LEFT );
		z2.kbd.addKey( z2.kbd.RIGHT );
		z2.kbd.addKey( z2.kbd.SPACEBAR );
	},
	update: function( e, dt )
	{
//		console.log( "input: update called" );

		// get the velocity component
		var vc = e.getComponent( z2.velocityFactory );

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
					spre.removeComponent( z2.velocityFactory );
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

// helper fcn to help sort sides of (random) AABBs
function swap( i, a, b )
{
	var tmp = i[a];
	i[a] = i[b];
	i[b] = tmp;
}

// called after assets are loaded
function start()
{
	// create a Tiled map scene
	var json = z2.loader.getAsset( 'level' );
	var scene = new z2.TiledScene( json, WIDTH, HEIGHT );
	// create a view on the scene
	var view = new z2.View( scene, WIDTH, HEIGHT, null, z2.FOLLOW_MODE_NONE, 500, 500 );

	var tmc = z2.tileMapFactory.create( {layers: scene.map.layers} );
	var tme = mgr.createEntity( [tmc] );
	var tms = z2.createTileMapSystem( view, canvas );
	mgr.addSystem( tms );

	// create a renderable image Entity
	var img = z2.loader.getAsset( 'logo' );
	var imgc = z2.imageFactory.create( {img:img} );
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
	var imge = mgr.createEntity( [z2.rootTransformFactory, imgxf, imgp, imgr, imgsz, imgs, imgcc, imgc, imgv] );

	var LEFT = 0, TOP = 1, RIGHT = 2, BOTTOM = 3;
	var vertices, vertices2;
	var i;
	var fill;
	var pv = [0,0];
	var pen;
	var polyc, polyp, polysz, polyxf, polyf, polye;
	var tric, trip, trisz, trixf, trif, trie;
	var aabb1 = [];
	var aabb2 = [];
	var c1 = [], c2 = [], r1, r2;
	var c1c, c1p, c1r, circlef, cxf, c1e;

	// test types
	var pvp = 'poly vs poly';
	var bvb = 'AABB vs AABB';
	var cvc = 'circle vs circle';
	var bvc = 'AABB vs circle';
	var bvp = 'AABB vs poly';
	var test = pvp;
	if( test == pvp )
	{
		vertices = [];
		// vertices for second triangle
		vertices2 = [0, 0, WIDTH/2, HEIGHT/2, 0, HEIGHT/2];

		// create a (random) polygon (triangle)
		for( i = 0; i < 3; i++ )
		{
			vertices.push( Math.random() * WIDTH - WIDTH/2, Math.random() * HEIGHT - HEIGHT/2 );
		}
		// ensure the vertices are in CW order
		z2.sortVertices( vertices );

		// collide polys
		pen = z2.collidePolyVsPoly( vertices2, vertices, pv );
		console.log( "collision penetration: " + pen );
		console.log( "collision penetration vector, x: " + pv[0] + ", y: " + pv[1] );
		if( pen > 0 )
			fill = 'rgba( 255, 0, 0, 0.5 )';
		else
			fill = 'rgba( 0, 255, 0, 0.5 )';

		// poly (tri) 1
		polyc = z2.polygonFactory.create( {vertices: vertices} );
		polyp = z2.positionFactory.create( {x: 500, y: 500} );
		polyxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		polyf = z2.fillFactory.create( {fill: fill} );
		polye = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, polyf, polyxf, polyc, polyp] );

		// create a (non-random) triangle to test collision with tri 1
		tric = z2.polygonFactory.create( {vertices: vertices2} );
		trip = z2.positionFactory.create( {x: 500, y: 500} );
		trixf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		trif = z2.fillFactory.create( {fill: fill} );
		trie = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, trif, trixf, tric, trip] );
	}
	else if( test == bvb )
	{
		// vertices for AABB bounding boxes
		for( i = 0; i < 2; i++ )
		{
			aabb1.push( Math.random() * WIDTH/2 );
			aabb1.push( Math.random() * HEIGHT/2 );
		}
//		aabb1 = [
//			120,
//			20,
//			200,
//			180
//	//
//			96.31799376010895,
//			17.876899302005768,
//			148.96559083461761,
//			175.86477649211884
//	//
//			80.77150797843933,
//			140.9154455512762,
//			159.0162754058838,
//			164.52973902225494
//		];
		for( i = 0; i < 2; i++ )
		{
			aabb2.push( Math.random() * WIDTH/2 - 100 );
			aabb2.push( Math.random() * HEIGHT/2 - 100 );
		}
		if( aabb1[LEFT] > aabb1[RIGHT] )
			swap( aabb1, LEFT, RIGHT );
		if( aabb1[TOP] > aabb1[BOTTOM] )
			swap( aabb1, TOP, BOTTOM );
		if( aabb2[LEFT] > aabb2[RIGHT] )
			swap( aabb2, LEFT, RIGHT );
		if( aabb2[TOP] > aabb2[BOTTOM] )
			swap( aabb2, TOP, BOTTOM );

		vertices = [
			// top left
			aabb1[LEFT], aabb1[TOP],
			// top right
			aabb1[RIGHT], aabb1[TOP],
			// bottom right
			aabb1[RIGHT], aabb1[BOTTOM],
			// bottom left
			aabb1[LEFT], aabb1[BOTTOM]
		];
		vertices2 = [
			// top left
			aabb2[LEFT], aabb2[TOP],
			// top right
			aabb2[RIGHT], aabb2[TOP],
			// bottom right
			aabb2[RIGHT], aabb2[BOTTOM],
			// bottom left
			aabb2[LEFT], aabb2[BOTTOM]
		];

		// collide
		pen = z2.collideAabbVsAabb( aabb2, aabb1, pv );
		console.log( "collision penetration: " + pen );
		console.log( "collision penetration vector, x: " + pv[0] + ", y: " + pv[1] );
		if( pen > 0 )
			fill = 'rgba( 255, 0, 0, 0.5 )';
		else
			fill = 'rgba( 0, 255, 0, 0.5 )';

		// poly (tri) 1
		polyc = z2.polygonFactory.create( {vertices: vertices} );
		polyp = z2.positionFactory.create( {x: 500, y: 500} );
		polyxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		polyf = z2.fillFactory.create( {fill: fill} );
		polye = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, polyf, polyxf, polyc, polyp] );

		// create a (non-random) triangle to test collision with tri 1
		tric = z2.polygonFactory.create( {vertices: vertices2} );
		trip = z2.positionFactory.create( {x: 500, y: 500} );
		trixf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		trif = z2.fillFactory.create( {fill: fill} );
		trie = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, trif, trixf, tric, trip] );
	}
	else if( test == cvc )
	{
		// circles
		c1[0] = Math.random() * WIDTH/2;
		c1[1] = Math.random() * HEIGHT/2;
		r1 = Math.random() * 100;
//		c1[0] = 30;
//		c1[1] = 80;
//		r1 = 89;
//		c1[0] = 122.15190207958221;
//		c1[1] = 143.43632671236992;
//		r1 = 43.06532689370215;
//		c1[0] = 131.15571069717407;
//		c1[1] = 147.69304387271404;
//		r1 = 18.20829943753779;
		c2[0] = Math.random() * WIDTH/2;
		c2[1] = Math.random() * HEIGHT/2;
		r2 = Math.random() * 200;
		// collide circles
		pen = z2.collideCircleVsCircle( c1, r1, c2, r2, pv );
		console.log( "collision penetration: " + pen );
		console.log( "collision penetration vector, x: " + pv[0] + ", y: " + pv[1] );
		if( pen > 0 )
			fill = 'rgba( 255, 0, 0, 0.5 )';
		else
			fill = 'rgba( 0, 255, 0, 0.5 )';

		// circle 1
		c1p = z2.positionFactory.create( {x: 500, y: 500} );
		cxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		c1c = z2.centerFactory.create( {cx: c1[0], cy: c1[1]} );
		c1r = z2.radiusFactory.create( {radius: r1} );
		circlef = z2.fillFactory.create( {fill: fill} );
		c1e = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, cxf, c1p, c1c, c1r, circlef] );
		// circle 2
		var c2p = z2.positionFactory.create( {x: 500, y: 500} );
		var c2c = z2.centerFactory.create( {cx: c2[0], cy: c2[1]} );
		var c2r = z2.radiusFactory.create( {radius: r2} );
		var c2e = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, cxf, c2p, c2c, c2r, circlef] );
	}
	else if( test == bvc )
	{
		// vertices for AABB bounding boxes
		for( i = 0; i < 2; i++ )
		{
			aabb1.push( Math.random() * WIDTH/2 );
			aabb1.push( Math.random() * HEIGHT/2 );
		}
		if( aabb1[LEFT] > aabb1[RIGHT] )
			swap( aabb1, LEFT, RIGHT );
		if( aabb1[TOP] > aabb1[BOTTOM] )
			swap( aabb1, TOP, BOTTOM );
//		aabb1 = [
//			68.9423161149025,
//			92.06795163452625,
//			226.27551406621933,
//			140.27565014362335
//		];
		vertices = [
			// top left
			aabb1[LEFT], aabb1[TOP],
			// top right
			aabb1[RIGHT], aabb1[TOP],
			// bottom right
			aabb1[RIGHT], aabb1[BOTTOM],
			// bottom left
			aabb1[LEFT], aabb1[BOTTOM]
		];
		c1[0] = Math.random() * WIDTH/2;
		c1[1] = Math.random() * HEIGHT/2;
		r1 = Math.random() * 100;
//		c1[0] = 44.339279770851135;
//		c1[1] = 137.29280045628548;
//		r1 = 95.52356873173267;

		pen = z2.collideAabbVsCircle( aabb1, c1, r1, pv );
		console.log( "collision penetration: " + pen );
		console.log( "collision penetration vector, x: " + pv[0] + ", y: " + pv[1] );
		if( pen > 0 )
			fill = 'rgba( 255, 0, 0, 0.5 )';
		else
			fill = 'rgba( 0, 255, 0, 0.5 )';

		// poly (tri) 1
		polyc = z2.polygonFactory.create( {vertices: vertices} );
		polyp = z2.positionFactory.create( {x: 500, y: 500} );
		polyxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		polyf = z2.fillFactory.create( {fill: fill} );
		polye = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, polyf, polyxf, polyc, polyp] );

		// circle 1
		c1p = z2.positionFactory.create( {x: 500, y: 500} );
		cxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		c1c = z2.centerFactory.create( {cx: c1[0], cy: c1[1]} );
		c1r = z2.radiusFactory.create( {radius: r1} );
		circlef = z2.fillFactory.create( {fill: fill} );
		c1e = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, cxf, c1p, c1c, c1r, circlef] );
	}
	else if( test == bvp )
	{
		// vertices for AABB bounding boxes
		for( i = 0; i < 2; i++ )
		{
			aabb1.push( Math.random() * WIDTH/2 );
			aabb1.push( Math.random() * HEIGHT/2 );
		}
		if( aabb1[LEFT] > aabb1[RIGHT] )
			swap( aabb1, LEFT, RIGHT );
		if( aabb1[TOP] > aabb1[BOTTOM] )
			swap( aabb1, TOP, BOTTOM );
		vertices = [
			// top left
			aabb1[LEFT], aabb1[TOP],
			// top right
			aabb1[RIGHT], aabb1[TOP],
			// bottom right
			aabb1[RIGHT], aabb1[BOTTOM],
			// bottom left
			aabb1[LEFT], aabb1[BOTTOM]
		];
		// create a (random) polygon (triangle)
		vertices2 = [];
		for( i = 0; i < 3; i++ )
		{
			vertices2.push( Math.random() * WIDTH - WIDTH/2, Math.random() * HEIGHT - HEIGHT/2 );
		}
		// ensure the vertices are in CW order
		z2.sortVertices( vertices2 );

		pen = z2.collideAabbVsPoly( aabb1, vertices2, pv );
		console.log( "collision penetration: " + pen );
		console.log( "collision penetration vector, x: " + pv[0] + ", y: " + pv[1] );
		if( pen > 0 )
			fill = 'rgba( 255, 0, 0, 0.5 )';
		else
			fill = 'rgba( 0, 255, 0, 0.5 )';

		// AABB poly
		polyc = z2.polygonFactory.create( {vertices: vertices} );
		polyp = z2.positionFactory.create( {x: 500, y: 500} );
		polyxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		polyf = z2.fillFactory.create( {fill: fill} );
		polye = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, polyf, polyxf, polyc, polyp] );

		// random poly (tri)
		tric = z2.polygonFactory.create( {vertices: vertices2} );
		trip = z2.positionFactory.create( {x: 500, y: 500} );
		trixf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
		trif = z2.fillFactory.create( {fill: fill} );
		trie = mgr.createEntity( [z2.rootTransformFactory, z2.renderableFactory, trif, trixf, tric, trip] );
	}


	// create an (animated) sprite
	var s_img = z2.loader.getAsset( 'man' );
	var anims = new z2.AnimationSet();
	anims.add( 'walk', [[0, 250], [1, 250]] );
	var sprc = z2.spriteFactory.create( {img:s_img, animations:anims} );
	var sprx = z2.transformFactory.create();
	// local position is (0, 0) - the group will be positioned at (500, 500),
	// centering us in scene (world) space
	var sprp = z2.positionFactory.create( {x: 0, y: 0} );
//	var sprr = z2.rotationFactory.create( {theta: 0} );
	var sprr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
	// reverse sprite facing
	var sprs = z2.scaleFactory.create( {sx: -1, sy: 1} );
	var sprsz = z2.sizeFactory.create( {width: 64, height: 64} );
	var sprcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
	var sprxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
//	spre = mgr.createEntity( [sprxf, sprp, sprpc, sprr, sprsz, sprs, sprcc, sprc, sprv, player] );
	spre = mgr.createEntity( [sprxf, sprp, sprr, sprsz, sprs, sprcc, sprc] );
	anims.play( 'walk' );

	// follow this sprite
	view.target = sprxf;
	view.follow_mode = z2.FOLLOW_MODE_TIGHT;

	// create a movement system
	var ms = z2.createMovementSystem();
	mgr.addSystem( ms );

	// create the transform system
	var xf = z2.createTransformSystem( view );
	mgr.addSystem( xf );

	// create a Group (component, entity & system) for transforming
	var transformArray = [];
	var tgc = z2.groupFactory.create( {group:transformArray} );
	var ttgc = z2.transformGroupFactory.create();
	var tgxf = z2.transformFactory.create( {xform: z2.math.matCreateIdentity()} );
	var tgp = z2.positionFactory.create( {x:500, y:500} );
//	var tgr = z2.rotationFactory.create( {theta: 0} );
	var tgr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
	var tgpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: scene.width-16, miny: 32, maxy: scene.height-32} );
	var tge = mgr.createEntity( [tgr, tgc, ttgc, tgp, tgxf, tgpc, sprv, player] );
	var tgs = z2.createTransformGroupSystem( xf );
	mgr.addSystem( tgs );

	// add our sprite to the transform group
	transformArray.push( spre );

	// create rendering system
	var rs = z2.createRenderingSystem( canvas, true );
//	var rs = z2.createRenderingSystem( canvas, false );
	// since we're using render groups, we don't need to add this system to the
	// ecs manager
//	mgr.addSystem( rs );

	// create a Group (component, entity & system) for rendering
	var rgc = z2.groupFactory.create( {group:[imge, spre]} );
	var rge = mgr.createEntity( [z2.renderGroupFactory, rgc] );
	var rgs = z2.createGroupSystem( rs, z2.renderGroupFactory );
	mgr.addSystem( rgs );
	// add the rendering system afterwards, so that renderables that aren't 
	// in the group render *after* the group
	mgr.addSystem( rs );

	// start the main ecs loop
	z2.main( z2.ecsUpdate );
}


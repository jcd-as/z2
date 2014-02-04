// z2 test code
// TODO:
// - improve usability of z2 & make this sample much cleaner
//

"use strict";

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require z2 modules
z2.require( ["loader", "input", "tiledscene", "audio"] );


// create a canvas
var canvas = z2.createCanvas( WIDTH, HEIGHT, true );

// create an object defining our scene
// (load, create and update methods)
var myScene = 
{
	load : function()
	{
		z2.loader.queueAsset( 'man', 'stylized.png' );
		z2.loader.queueAsset( 'snd', 'field.mp3' );
//		z2.loader.queueAsset( 'snd', 'field.ogg' );
	},

	create : function()
	{
		// create an 'enemy' component, for enemy 'AI'
		var enemyc = z2.createComponentFactory();
		var enemy_sys = new z2.System( [enemyc, z2.velocityFactory, z2.physicsBodyFactory],
		{
			init: function()
			{
			},
			update: function( e, dt )
			{
//				var bc = e.getComponent( z2.physicsBodyFactory.mask );
//				var vc = e.getComponent( z2.velocityFactory.mask );
//		
//				// if we're going to the left and we're blocked, turn right
//				if( vc.x <= 0 && bc.blocked_left )
//					vc.x = 100;
//				// if we're going to the right and we're blocked, turn left
//				else if( vc.x >= 0 && bc.blocked_right )
//					vc.x = -100;
//				// if we're not moving, just try going left
//				else if( vc.x === 0 )
//					vc.x = -100;
			}
		} );

		// create a "player control" component
		var player = z2.createComponentFactory();
		// placeholder for sprite entity
		var spre;
		// create an input system
		var vel_sw_time = 0;
		var vel_on;
		var sprv = z2.velocityFactory.create( {x: 0, y: 0, maxx: 200, maxy: 500} );
		//var sprv = z2.velocityFactory.create( {x: 100, y: 0, maxx: 200, maxy: 500} );
		var input_sys = new z2.System( [player, z2.velocityFactory, z2.physicsBodyFactory],
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

				// get the physics body
				var bc = e.getComponent( z2.physicsBodyFactory.mask );

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
//					var vel_inc = 100;
//					if( z2.kbd.isDown( z2.kbd.UP ) )
//						vc.y = -vel_inc;
//					else if( z2.kbd.isDown( z2.kbd.DOWN ) )
//						vc.y = vel_inc;
//					else
//						vc.y = 0;
//					if( z2.kbd.isDown( z2.kbd.LEFT ) )
//						vc.x = -vel_inc;
//					else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
//						vc.x = vel_inc;
//					else vc.x = 0;
					// side-scroller
//					var h_vel_inc = 100;
					var h_vel_inc = 10;
					var v_vel_inc = 750;
					// only jump when standing on 'ground'
					if( bc.blocked_down && z2.kbd.isDown( z2.kbd.UP ) )
						vc.y = -v_vel_inc;
//					else
//						vc.y = 0;
					if( z2.kbd.isDown( z2.kbd.LEFT ) )
//						vc.x = -h_vel_inc;
						vc.x += -h_vel_inc;
					else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
//						vc.x = h_vel_inc;
						vc.x += h_vel_inc;
//					else vc.x = 0;
				}
			}
		} );

		// create a collision map
		// (for 50-layer perf test:)
//		var collisionMap = z2.buildCollisionMap( scene.map.layers[48].data, scene.map.widthInTiles, scene.map.heightInTiles, [0,1,2,3,4] );
		var collisionMap = z2.buildCollisionMap( this.map.layers[1].data, this.map.widthInTiles, this.map.heightInTiles, [0,1,2,3,4] );

		// create a collision map component
		var cmc = z2.collisionMapFactory.create( {map: this.map, data: collisionMap} );

		// gravity component
		var gravc = z2.gravityFactory.create( {x: 0, y: 1000} );

		// create an (animated) sprite
		var s_img = z2.loader.getAsset( 'man' );
		var anims = new z2.AnimationSet();
		anims.add( 'walk', [[0, 250], [1, 250]] );
		var sbasetexture = new PIXI.BaseTexture( s_img );
		var stexture = new PIXI.Texture( sbasetexture );
		var sprite = new PIXI.Sprite( stexture );
		this.view.doc.addChild( sprite );
		var sprc = z2.spriteFactory.create( {sprite:sprite, animations:anims} );
//		var sprp = z2.positionFactory.create( {x: 512, y: 512} );
		var sprp = z2.positionFactory.create( {x: 1024-64, y: 1024-64} );
		var sprr = z2.rotationFactory.create( {theta: 0} );
//		var sprr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
		// reverse sprite facing
//		var sprs = z2.scaleFactory.create( {sx: -1, sy: 1} );
		var sprs = z2.scaleFactory.create( {sx: 1, sy: 1} );
		var sprsz = z2.sizeFactory.create( {width: 64, height: 64} );
		var sprcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
		var sprpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: this.width-16, miny: 32, maxy: this.height-32} );
		var sprbody = z2.physicsBodyFactory.create( {aabb:[-32, -15, 32, 15], restitution:1, mass:1, resistance_x:0.95} );
		anims.play( 'walk' );

		// collision group for the enemy to collide against
		var ecolg = z2.collisionGroupFactory.create( {entities:null} );

		// create a non-player sprite
		var anims2 = new z2.AnimationSet();
		anims2.add( 'jitter', [[8, 250], [9, 250]] );
		var sbasetexture2 = new PIXI.BaseTexture( s_img );
		var stexture2 = new PIXI.Texture( sbasetexture2 );
		var sprv2 = z2.velocityFactory.create( {x: -100, y: 0, maxx: 200, maxy: 500} );
		var sprite2 = new PIXI.Sprite( stexture2 );
		this.view.doc.addChild( sprite2 );
		var sprc2 = z2.spriteFactory.create( {sprite:sprite2, animations:anims2} );
		var sprp2 = z2.positionFactory.create( {x: 64, y: 1024-64} );
		var sprbody2 = z2.physicsBodyFactory.create( {aabb:[-32, -16, 32, 16], restitution:1, mass:1, resistance_x: 0} );
		var spre2 = this.mgr.createEntity( [z2.renderableFactory, enemyc, gravc, cmc, sprbody2, sprv2, sprp2, sprsz, sprs, sprcc, sprpc, sprc2, ecolg] );
		anims2.play( 'jitter' );

		// collision group for the player to collide against
		var pcolg = z2.collisionGroupFactory.create( {entities:[spre2]} );

		// create the player sprite
		spre = this.mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, sprsz, sprs, sprcc, sprpc, sprc, pcolg] );

		// set the entities for enemy collision group
		ecolg.entities = [spre];

		// follow the player sprite
//		this.view.follow_mode = z2.FOLLOW_MODE_TIGHT;
		this.view.follow_mode = z2.FOLLOW_MODE_PLATFORMER;
		this.view.target = sprp;

		// create a movement system
		var ms = z2.createMovementSystem();

		// add the systems (in order)

		// add our enemy and input systems
		this.mgr.addSystem( enemy_sys );
		this.mgr.addSystem( input_sys );

		// movement system
		this.mgr.addSystem( ms );

		z2.playSound( 'snd' );

	},

	update : function( dt )
	{
	}
};


// create a Tiled map scene using our scene definition object
var scene = new z2.TiledScene( canvas, 'test.json', myScene );

// start the scene
scene.start();

// start the main ecs loop
z2.main( z2.ecsUpdate );


// z2 test code
// TODO:
// - improve usability of z2 & make this sample much cleaner
//

(function()
{
"use strict";

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require z2 modules
z2.require( ["loader", "input", "tiledscene", "audio", "statemachine"] );
 
// create a canvas
var canvas = z2.createCanvas( WIDTH, HEIGHT, true );

// global set-up stuff
// TODO: move this to a "game" class??
var paused = false;
var visibilityChange = function( event )
{
	if( paused === false && (event.type == 'pagehide' || event.type == 'blur' || document.hidden === true || document.webkitHidden === true))
		paused = true;
	else
		paused = false;

	if( paused )
		z2.pauseSounds();
	else
		z2.resumeSounds();
};
document.addEventListener( 'visibilitychange', visibilityChange, false );
document.addEventListener( 'webkitvisibilitychange', visibilityChange, false );
document.addEventListener( 'pagehide', visibilityChange, false );
document.addEventListener( 'pageshow', visibilityChange, false );
window.onblur = visibilityChange;
window.onfocus = visibilityChange;

// create an object defining our scene
// (load, create and update methods)
var myScene = 
{
	load : function()
	{
		z2.loader.queueAsset( 'man', 'stylized.png' );
		z2.loader.queueAsset( 'logo', 'logo.png' );
		z2.loader.queueAsset( 'field', 'field.mp3' );
//		z2.loader.queueAsset( 'field', 'field.ogg' );
		z2.loader.queueAsset( 'land', 'landing.mp3' );
//		z2.loader.queueAsset( 'land', 'landing.ogg' );
//		z2.loader.queueAsset( 'theme', 'logo.mp3' );
//		z2.loader.queueAsset( 'theme', 'logo.ogg' );
	},

	create : function()
	{
		// create an 'enemy' component, for enemy 'AI'
		var enemyc = z2.createComponentFactory();
		var enemy_sys = new z2.System( 100, [enemyc, z2.velocityFactory, z2.physicsBodyFactory],
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
		this.mgr.addSystem( enemy_sys );

		// create a "player control" component
		var player = z2.createComponentFactory();
		// placeholder for sprite entity
		var spre;
		// create an input system
		var input_sys = new z2.System( 50, [player, z2.velocityFactory, z2.physicsBodyFactory],
		{
			init: function()
			{
				// initialize FSM
				this.fsm = new z2.StateMachine( this.states, this );
				
				// initialize keyboard
				z2.kbd.start();
				z2.kbd.addKey( z2.kbd.UP );
				z2.kbd.addKey( z2.kbd.LEFT );
				z2.kbd.addKey( z2.kbd.RIGHT );
			},
			update: function( e, dt )
			{
				// get the velocity component
				var vc = e.getComponent( z2.velocityFactory.mask );

				// get the physics body
				var bc = e.getComponent( z2.physicsBodyFactory.mask );

				// get the scale component
				var sc = e.getComponent( z2.scaleFactory.mask );

				// check keys
				var left = false;
				var right = false;
				var jump = false;
				// only jump when standing on 'ground'
				if( bc.blocked_down && z2.kbd.isDown( z2.kbd.UP ) )
					jump = true;
				if( z2.kbd.isDown( z2.kbd.LEFT ) )
					left = true;
				else if( z2.kbd.isDown( z2.kbd.RIGHT ) )
					right = true;

				var state = this.fsm.getState();
				switch( state )
				{
				case 'walking':
					// reset horizontal velocity
//					vc.x = 0;

					// can jump, fall, keep walking or stop
					if( jump )
						this.fsm.consumeEvent( 'jump', vc, bc );
					// not touching ground ?
					else if( !bc.blocked_down )
						this.fsm.consumeEvent( 'fall', vc, bc );
					else if( left )
					{
						this.goLeft( vc, bc, sc );
					}
					else if( right )
					{
						this.goRight( vc, bc, sc );
					}
					else
					{
						// stop
						this.fsm.consumeEvent( 'stop' );
					}
					break;
				case 'jumping':
				case 'falling':
					// reset horizontal velocity
//					vc.x = 0;

					// land?
					if( bc.blocked_down )
					{
						z2.playSound( 'land' );
						this.fsm.consumeEvent( 'land', vc, bc, sc );
					}
					// can move side to side
					if( left )
					{
						this.facing = 'left';
						this.goLeft( vc, bc, sc );
					}
					else if( right )
					{
						this.facing = 'right';
						this.goRight( vc, bc, sc );
					}
					break;
				case 'idle':
					// reset horizontal velocity
//					vc.x = 0;

					// can walk or jump
					if( jump )
						this.fsm.consumeEvent( 'jump', vc, bc, sc );
					else if( left )
					{
						this.facing = 'left';
						this.fsm.consumeEvent( 'left', vc, bc, sc );
					}
					else if( right )
					{
						this.facing = 'right';
						this.fsm.consumeEvent( 'right', vc, bc, sc );
					}
					break;
				default:
					break;
				}
				////////////////////////////
			},
			facing : 'left',
			h_vel_inc : 200,
			v_vel_inc : 750,
			// finite state machine states for player sprite
			fsm : null,
			states : 
			[
				{
					'name' : 'idle',
					'initial' : true,
					'events' :
					{
						'left' : 'walking',
						'right' : 'walking',
						'jump' : 'jumping',
					}
				},
				{
					'name' : 'walking',
					'events' :
					{
						'stop' : 'idle',
						'jump' : 'jumping',
						'fall' : 'falling',
					}
				},
				{
					'name' : 'jumping',
					'events' :
					{
						'land' : 'idle',
						'fall' : 'falling'
					}
				},
				{
					'name' : 'recovering',
					'events' :
					{
						'recover' : 'idle'
					}
				},
				{
					'name' : 'falling',
					'events' : 
					{
						'land' : 'idle',
					}
				}
			],
			// state handlers
			idle : function( vc, bc, sc )
			{
				// set animation, facing
			},
			walking : function( vc, bc, sc )
			{
				// set animation, facing
				if( this.facing == 'left' )
					this.goLeft( vc, bc, sc );
				else if( this.facing == 'right' )
					this.goRight( vc, bc, sc );
//				else error
			},
			jumping : function( vc, bc, sc )
			{
				vc.y = -this.v_vel_inc;
				// set animation, facing
			},
			falling : function( vc, bc, sc )
			{
				// set animation, facing
			},
			goLeft : function( vc, bc, sc )
			{
				vc.x += -this.h_vel_inc;
				if( sc )
					sc.sx = -1; 
			},
			goRight : function( vc, bc, sc )
			{
				vc.x += this.h_vel_inc;
				if( sc )
					sc.sx = 1; 
			},
		} );
		this.mgr.addSystem( input_sys );

		// create a collision map
		// (for 50-layer perf test:)
//		var collisionMap = z2.buildCollisionMap( scene.map.layers[48].data, scene.map.widthInTiles, scene.map.heightInTiles, [0,1,2,3,4] );
//		var collisionMap = z2.buildCollisionMap( this.map.layers[1].data, this.map.widthInTiles, this.map.heightInTiles, [0,1,2,3,4] );
		var collisionMap = this.map.collisionMap;

		// create a collision map component
		var cmc = z2.collisionMapFactory.create( {map: this.map, data: collisionMap} );

		// gravity component
		var gravc = z2.gravityFactory.create( {x: 0, y: 1000} );

		// create the player sprite
		var s_img = z2.loader.getAsset( 'man' );
		var anims = new z2.AnimationSet();
		anims.add( 'walk', [[0, 250], [1, 250]] );
		var sbasetexture = new PIXI.BaseTexture( s_img );
		var stexture = new PIXI.Texture( sbasetexture );
		var sprite = new PIXI.Sprite( stexture );
		this.view.add( sprite );
		var sprc = z2.spriteFactory.create( {sprite:sprite, animations:anims} );
		var sprv = z2.velocityFactory.create( {x: 0, y: 0, maxx: 200, maxy: 500} );
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
		// collision group for the player to collide against
		var pcolg = z2.collisionGroupFactory.create( {entities:[spre2]} );
		// create the entity
		spre = this.mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, sprsz, sprs, sprcc, sprpc, sprc, pcolg] );

		anims.play( 'walk' );

		// create a non-player sprite
		var anims2 = new z2.AnimationSet();
		anims2.add( 'jitter', [[8, 250], [9, 250]] );
		var sbasetexture2 = new PIXI.BaseTexture( s_img );
		var stexture2 = new PIXI.Texture( sbasetexture2 );
		var sprv2 = z2.velocityFactory.create( {x: -100, y: 0, maxx: 200, maxy: 500} );
		var sprite2 = new PIXI.Sprite( stexture2 );
		this.view.add( sprite2 );
		var sprc2 = z2.spriteFactory.create( {sprite:sprite2, animations:anims2} );
		var sprp2 = z2.positionFactory.create( {x: 64, y: 1024-64} );
		var sprbody2 = z2.physicsBodyFactory.create( {aabb:[-32, -16, 32, 16], restitution:1, mass:1, resistance_x: 0} );
		// create the entity
		var spre2 = this.mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody2, sprv2, sprp2, sprsz, sprs, sprcc, sprpc, sprc2] );
		anims2.play( 'jitter' );

		// create a 'billboard' image
		var img = z2.loader.getAsset( 'logo' );
		var imgc = z2.imageFactory.create( {img:img} );
		var imgp = z2.positionFactory.create( {x: WIDTH/2, y: HEIGHT/2} );
		var imgr = z2.rotationFactory.create( {theta: 0} );
		var imgs = z2.scaleFactory.create( {sx: 1, sy: 1} );
		var imgsz = z2.sizeFactory.create( {width: 512, height: 384} );
		var imgcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
		var imge = this.mgr.createEntity( [z2.rootTransformFactory, imgp, imgr, imgsz, imgs, imgcc, imgc] );
		var basetexture = new PIXI.BaseTexture( img );
		var texture = new PIXI.Texture( basetexture );
		var image = new PIXI.Sprite( texture );
		image.alpha = 0.25;
		this.view.add( image, true );

		// set the entities for collision groups
		pcolg.entities = [spre2];

		// follow the player sprite
//		this.view.follow_mode = z2.FOLLOW_MODE_TIGHT;
		this.view.follow_mode = z2.FOLLOW_MODE_PLATFORMER;
		this.view.target = sprp;

		// create a movement system
		var ms = z2.createMovementSystem( 200 );
		this.mgr.addSystem( ms );

//		z2.playSound( 'field', 0, 1, true );
//		z2.playSound( 'theme', 0, 1, true );

		//////////////////
		// add global handlers for web page controls
		window.updateMass = function( value )
		{
			sprbody.mass = value;
		};
		window.updateRestitution = function( value )
		{
			sprbody.restitution = value;
		};
		window.updateResistanceX = function( value )
		{
			sprbody.resistance_x = value;
		};
		window.updateResistanceY = function( value )
		{
			sprbody.resistance_y = value;
		};
		window.updateGravity = function( value )
		{
			gravc.y = value;
		};

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
//z2.main( z2.ecsUpdate );
function mainloop( et )
{
	// TODO: problem with this is that ecsUpdate calculates the time delta, so
	// by intercepting here the dt doesn't get updated properly
	if( !paused )
		z2.ecsUpdate( et );
}
z2.main( mainloop );

})();

// z2 test code
// TODO:
// - improve usability of z2 & make this sample much cleaner
//

(function()
{
"use strict";

// stats fps display
var stats = new Stats();
document.body.appendChild( stats.domElement );
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require z2 modules
z2.require( ["loader", "input", "tiledscene", "audio", "statemachine", "emitter"] );
 
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

// global 'game' object
window.game = {};

// create an object defining our scene
// (load, create and update methods)
var myScene = 
{
	load : function()
	{
		z2.loader.queueAsset( 'man', 'stylized.png' );
		z2.loader.queueAsset( 'firefly', 'firefly.png' );
		z2.loader.queueAsset( 'logo', 'logo.png' );
		z2.loader.queueAsset( 'field', 'field.mp3' );
//		z2.loader.queueAsset( 'field', 'field.ogg' );
		z2.loader.queueAsset( 'land', 'landing.mp3' );
//		z2.loader.queueAsset( 'land', 'landing.ogg' );
//		z2.loader.queueAsset( 'theme', 'logo.mp3' );
//		z2.loader.queueAsset( 'theme', 'logo.ogg' );

		z2.loader.queueAsset( 'font', 'open_sans_italic_20.fnt' );

		z2.loader.queueAsset( 'left', 'the_source/assets/img/button_left.png' );
//		z2.loader.queueAsset( 'right', 'the_source/assets/img/button_right.png' );
//		z2.loader.queueAsset( 'circle', 'the_source/assets/img/button_circle.png' );
//		z2.loader.queueAsset( 'square', 'the_source/assets/img/button_square.png' );
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
//				var bc = e.getComponent( z2.physicsBodyFactory );
//				var vc = e.getComponent( z2.velocityFactory );
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
				var vc = e.getComponent( z2.velocityFactory );

				// get the physics body
				var bc = e.getComponent( z2.physicsBodyFactory );

				// get the scale component
				var sc = e.getComponent( z2.scaleFactory );

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
		var sprc = z2.spriteFactory.create( {sprite:sprite, width: 64, animations:anims} );
		var sprv = z2.velocityFactory.create( {x: 0, y: 0, maxx: 200, maxy: 500} );
//		var sprp = z2.positionFactory.create( {x: 512, y: 512} );
		var sprp = z2.positionFactory.create( {x: 1024-64, y: 1024-64} );
		var sprr = z2.rotationFactory.create( {theta: 0} );
//		var sprr = z2.rotationFactory.create( {theta: z2.math.d2r(10)} );
		// reverse sprite facing
//		var sprs = z2.scaleFactory.create( {sx: -1, sy: 1} );
		var sprres = z2.resistanceFactory.create( {x: 0.95} );
		var sprs = z2.scaleFactory.create( {sx: 1, sy: 1} );
//		var sprsz = z2.sizeFactory.create( {width: 64, height: 64} );
		var sprcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
		var sprpc = z2.positionConstraintsFactory.create( {minx: 16, maxx: this.width-16, miny: 32, maxy: this.height-32} );
		var sprbody = z2.physicsBodyFactory.create( {aabb:[-32, -15, 32, 15], restitution:1, mass:1} );
		// collision group for the player to collide against
		var pcolg = z2.collisionGroupFactory.create( {entities:[spre2]} );
		// create the entity
		spre = this.mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, /*sprsz,*/ sprs, sprcc, sprpc, sprc, pcolg, sprres] );

		anims.play( 'walk' );

		// create a non-player sprite
		var anims2 = new z2.AnimationSet();
		anims2.add( 'jitter', [[8, 250], [9, 250]] );
		var sbasetexture2 = new PIXI.BaseTexture( s_img );
		var stexture2 = new PIXI.Texture( sbasetexture2 );
		var sprite2 = new PIXI.Sprite( stexture2 );
		var sprv2 = z2.velocityFactory.create( {x: -100, y: 0, maxx: 200, maxy: 500} );
		this.view.add( sprite2 );
		var sprc2 = z2.spriteFactory.create( {sprite:sprite2, width:64, animations:anims2} );
		var sprp2 = z2.positionFactory.create( {x: 64, y: 1024-64} );
		var sprbody2 = z2.physicsBodyFactory.create( {aabb:[-32, -16, 32, 16], restitution:1, mass:1, resistance_x: 0} );
		// create the entity
		var spre2 = this.mgr.createEntity( [z2.renderableFactory, gravc, cmc, sprbody2, sprv2, sprp2, /*sprsz,*/ sprs, sprcc, sprpc, sprc2] );
		anims2.play( 'jitter' );

		// create a 'billboard' image
		var img = z2.loader.getAsset( 'logo' );
		var imgp = z2.positionFactory.create( {x: WIDTH/2, y: HEIGHT/2} );
		var imgr = z2.rotationFactory.create( {theta: 0} );
		var imgs = z2.scaleFactory.create( {sx: 1, sy: 1} );
		var imgsz = z2.sizeFactory.create( {width: 512, height: 384} );
		var imgcc = z2.centerFactory.create( {cx: 0.5, cy: 0.5} );
		var basetexture = new PIXI.BaseTexture( img );
		var texture = new PIXI.Texture( basetexture );
		var image = new PIXI.Sprite( texture );
		image.alpha = 0.25;
		this.view.add( image, true );
		var imgc = z2.imageFactory.create( {sprite:image} );
		var imge = this.mgr.createEntity( [z2.renderableFactory, imgp, imgr, imgsz, imgs, imgcc, imgc] );

		// draw some text
		var txt = new PIXI.BitmapText( "foobar", {font: 'Open_Sans', align: 'center'} );
		txt.position.x = WIDTH/2 - txt.textWidth/2;
		txt.position.y = HEIGHT/2 - txt.textHeight/2;
		this.view.add( txt, true );

		// create an emitter
		//
		var emc = z2.emitterFactory.create(
		{
			// is the emitter on?
			on: true,
			// is this a 'burst' emitter? (fires all particles, then turns off)
			burst: false,
			// how many particles are released at a time?
			quantity: 10000, 
			// how often (in ms) are particles released?
			period: 3000,
			// how long to wait before the first release of particles?
			delay: 1000,
			// width of the emitter (in pixels)
			width: 100,
			// height of the emitter (in pixels)
			height: 100,
			// min/max particle speeds (chosen at random in this range)
			minParticleSpeedX: -50, maxParticleSpeedX: 50,
			minParticleSpeedY: -50, maxParticleSpeedY: 50,
			// min/max particle rotation (chosen at random in this range)
			minRotation: 0, maxRotation: 180,
			// min/max particle alpha transparency
			minAlpha: 0.1, maxAlpha: 0.4,
			// min/max particle lifespan (in ms)
			minLifespan: 10000, maxLifespan: 10000,
		} );
		var empos = z2.positionFactory.create( {x: 700, y: 800} );
		var eme = this.mgr.createEntity( 
		[
			emc,
			empos
		] );
		

		// add touchscreen buttons
		z2.touch.start( 5 );
		z2.touch.addButton( z2.loader.getAsset( 'left' ) );

		// set the entities for collision groups
		pcolg.entities = [spre2];

		// follow the player sprite
//		this.view.follow_mode = z2.FOLLOW_MODE_TIGHT;
		this.view.follow_mode = z2.FOLLOW_MODE_PLATFORMER;
		this.view.target = sprp;


		// create an emitter system
		var es = z2.createEmitterSystem( this.view, 'firefly', 8 );
		this.mgr.addSystem( es );
		// create a particle system to go with it
//		var ps = z2.createParticleSystem( this.view );
//		this.mgr.addSystem( ps );

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
			sprres.x = value;
		};
		window.updateResistanceY = function( value )
		{
			sprres.y = value;
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
game.scene = scene;

// start the scene
scene.start();

// start the main ecs loop
//z2.main( z2.ecsUpdate );
function mainloop( et )
{
	stats.begin();
	// TODO: problem with this is that ecsUpdate calculates the time delta, so
	// by intercepting here the dt doesn't get updated properly
	if( !paused )
		z2.ecsUpdate( et );
	stats.end();
}
z2.main( mainloop );

})();

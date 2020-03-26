// z2 test code
// TODO:
// - improve usability of z2 & make this sample much cleaner
//

import loader from '../../js/loader.js'
import * as input from '../../js/input.js'
import View from '../../js/view-pixi.js'
import Game from '../../js/game.js'
import TiledScene from '../../js/tiledscene.js'
import * as audio from '../../js/audio.js'
import StateMachine from '../../js/statemachine.js'
import * as emitter from '../../js/emitter.js'
import zSquared from '../../js/z2.js'
import * as collision from '../../js/collision.js'
import * as tilemap from '../../js/tilemap.js'
import * as ecs from '../../js/ecs.js'
import * as _2d from '../../js/2d-pixi.js'


(function()
{
//"use strict"

// stats fps display
// eslint-disable-next-line no-undef
var stats = new Stats()
document.body.appendChild(stats.domElement)
stats.domElement.style.position = 'absolute'
stats.domElement.style.top = '0px'

const WIDTH = 512
const HEIGHT = 384

const z2 = new zSquared()

// test tilemap rendering methods:
// WORKING. fast & solid with 3 layers, unusably slow (~11fps) with 50
//tilemap.setRenderMethod(tilemap.RENDER_SIMPLE)

// (mostly) WORKING - one tile width on left/top of map shows a 'smeared' tile
// when it first becomes visible (i.e. only when it is the only tile-width
// visible outside of the map area)
// quite fast & solid with 3 layers; decent, but jumpy with 50
//tilemap.setRenderMethod(tilemap.RENDER_OPT_PAGES)
//
// WORKING. decent framerate with 50 layers
//tilemap.setRenderMethod(tilemap.RENDER_PIXI_SPR)
//
// (default), WORKING. mostly solid & fast (~60fps) with 50 layers
//tilemap.setRenderMethod(tilemap.RENDER_OPT_PIXI_SPR)
//
// WORKING. solid & fast with 3 layers, jerky (~20-45fps) with 50
//tilemap.setRenderMethod(tilemap.RENDER_PIXI_ALL_SPR)

// global 'game' object
const div = document.getElementById('canvas')
const game = new Game(WIDTH, HEIGHT, null /*target*/, View.FOLLOW_MODE_PLATFORMER)
div.appendChild(game.app.view)

// global set-up stuff
const visibilityChange = function(event) {
	if(game.paused === false && (event.type == 'pagehide' || event.type == 'blur' || document.hidden === true || document.webkitHidden === true))
		game.paused = true
	else
		game.paused = false

	if(game.paused)
		audio.pauseSounds()
	else
		audio.resumeSounds()
}
document.addEventListener('visibilitychange', visibilityChange, false)
document.addEventListener('webkitvisibilitychange', visibilityChange, false)
document.addEventListener('pagehide', visibilityChange, false)
document.addEventListener('pageshow', visibilityChange, false)
window.onblur = visibilityChange
window.onfocus = visibilityChange

// create a "player control" component
const player = ecs.createComponentFactory()

// create an 'enemy' component, for enemy 'AI'
const enemyc = ecs.createComponentFactory()

// create an object defining our scene
// (load, create and update methods)
const myScene =
{
	load : function()
	{
//		loader.setBaseUrl('./')
		loader.setFontBaseUrl('assets/img/')
		loader.setImageBaseUrl('assets/img/')
		loader.setAudioBaseUrl('assets/snd/')
		loader.queueAsset('man', 'stylized.png')
		loader.queueAsset('firefly', 'firefly.png', 'spritesheet', 8, 8)
		loader.queueAsset('logo', 'logo.png')
		loader.queueAsset('field', 'field.mp3')
//		loader.queueAsset('field', 'field.ogg')
		loader.queueAsset('land', 'landing.mp3')
//		loader.queueAsset('land', 'landing.ogg')
//		loader.queueAsset('theme', 'logo.mp3')
//		loader.queueAsset('theme', 'logo.ogg')

		loader.queueAsset('font', 'open_sans_italic_20.fnt')

		loader.queueAsset('left', 'button_left.png')
//		loader.queueAsset('left', 'button_left.png')
//		loader.queueAsset('right', 'button_right.png')
//		loader.queueAsset('circle', 'button_circle.png')
//		loader.queueAsset('square', 'button_square.png')
	},

	create : function() {
		const enemy_sys = new ecs.System(100, [enemyc, _2d.velocityFactory, _2d.physicsBodyFactory], {
			init: function() { },
			// eslint-disable-next-line no-unused-vars
			update: function(e, dt) {
//				var bc = e.getComponent(_2d.physicsBodyFactory)
//				var vc = e.getComponent(_2d.velocityFactory)
//
//				// if we're going to the left and we're blocked, turn right
//				if(vc.x <= 0 && bc.blocked_left)
//					vc.x = 100
//				// if we're going to the right and we're blocked, turn left
//				else if(vc.x >= 0 && bc.blocked_right)
//					vc.x = -100
//				// if we're not moving, just try going left
//				else if(vc.x === 0)
//					vc.x = -100
			}
		})
		ecs.manager.get().addSystem(enemy_sys)

		// create an input system
		const input_sys = new ecs.System( 50, [player, _2d.velocityFactory, _2d.physicsBodyFactory], {
			init: function() {
				// initialize FSM
				this.fsm = new StateMachine(this.states, this)

				// initialize keyboard
				input.kbd.start()
				input.kbd.addKey(input.kbd.UP)
				input.kbd.addKey(input.kbd.LEFT)
				input.kbd.addKey(input.kbd.RIGHT)
				input.kbd.addKey(input.kbd.SPACEBAR)
			},
			// eslint-disable-next-line no-unused-vars
			update: function(e, dt) {
				if(input.kbd.isDown(input.kbd.SPACEBAR))
				{
					game.scene.restart()
					return
				}

				// get the velocity component
				const vc = e.getComponent(_2d.velocityFactory)

				// get the physics body
				const bc = e.getComponent(_2d.physicsBodyFactory)

				// get the scale component
				const sc = e.getComponent(_2d.scaleFactory)

				// check keys
				let left = false
				let right = false
				let jump = false
				// only jump when standing on 'ground'
				if(bc.blocked_down && input.kbd.isDown( input.kbd.UP ))
					jump = true
				if( input.kbd.isDown(input.kbd.LEFT))
					left = true
				else if(input.kbd.isDown(input.kbd.RIGHT))
					right = true

				const state = this.fsm.getState()
				switch(state) {
				case 'walking':
					// reset horizontal velocity
//					vc.x = 0

					// can jump, fall, keep walking or stop
					if(jump)
						this.fsm.consumeEvent('jump', vc, bc)
					// not touching ground ?
					else if(!bc.blocked_down)
						this.fsm.consumeEvent('fall', vc, bc)
					else if(left) {
						this.goLeft(vc, bc, sc)
					}
					else if(right) {
						this.goRight(vc, bc, sc)
					}
					else {
						// stop
						this.fsm.consumeEvent('stop')
					}
					break
				case 'jumping':
				case 'falling':
					// reset horizontal velocity
//					vc.x = 0

					// land?
					if(bc.blocked_down) {
						audio.playSound('land')
						this.fsm.consumeEvent('land', vc, bc, sc)
					}
					// can move side to side
					if(left) {
						this.facing = 'left'
						this.goLeft(vc, bc, sc)
					}
					else if(right) {
						this.facing = 'right'
						this.goRight(vc, bc, sc)
					}
					break
				case 'idle':
					// reset horizontal velocity
//					vc.x = 0

					// can walk or jump
					if(jump)
						this.fsm.consumeEvent('jump', vc, bc, sc)
					else if(left) {
						this.facing = 'left'
						this.fsm.consumeEvent('left', vc, bc, sc)
					}
					else if(right) {
						this.facing = 'right'
						this.fsm.consumeEvent('right', vc, bc, sc)
					}
					break
				default:
					break
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
			// eslint-disable-next-line no-unused-vars
			idle : function(vc, bc, sc) {
				// set animation, facing
			},
			walking : function(vc, bc, sc) {
				// set animation, facing
				if(this.facing == 'left')
					this.goLeft(vc, bc, sc)
				else if(this.facing == 'right')
					this.goRight(vc, bc, sc)
			},
			// eslint-disable-next-line no-unused-vars
			jumping : function(vc, bc, sc) {
				vc.y = -this.v_vel_inc
				// set animation, facing
			},
			// eslint-disable-next-line no-unused-vars
			falling : function(vc, bc, sc) {
				// set animation, facing
			},
			goLeft : function(vc, bc, sc) {
				vc.x += -this.h_vel_inc
				if(sc)
					sc.sx = -1
			},
			goRight : function(vc, bc, sc) {
				vc.x += this.h_vel_inc
				if(sc)
					sc.sx = 1
			},
		})
		ecs.manager.get().addSystem(input_sys)

		// TODO: shouldn't the TileMap (via TiledScene) be doing this??
		// create a collision map
		// (for 50-layer perf test:)
		let tiles = [
			{solid: false}, {solid: true}
		]
		const collisionMap = collision.buildCollisionMap(scene.map.layers[48].data, scene.map.widthInTiles, scene.map.heightInTiles, tiles)
//		const collisionMap = collision.buildCollisionMap(scene.map.layers[1].data, scene.map.widthInTiles, scene.map.heightInTiles, tiles)

		// create a collision map component
		const cmc = tilemap.collisionMapFactory.create({map: this.map, data: collisionMap})

		// gravity component
		const gravc = _2d.gravityFactory.create({x: 0, y: 1000})

		// create the player sprite
		const s_img = loader.getAsset('man')
		const anims = new _2d.AnimationSet()
		anims.add('walk', [[0, 250], [1, 250]])
		// eslint-disable-next-line no-undef
		const sbasetexture = new PIXI.BaseTexture(s_img)
		// eslint-disable-next-line no-undef
		const stexture = new PIXI.Texture(sbasetexture)
		// eslint-disable-next-line no-undef
		const sprite = new PIXI.Sprite(stexture)
		game.view.add(sprite)
		const sprc = _2d.spriteFactory.create({sprite:sprite, width: 64, animations:anims})
		const sprv = _2d.velocityFactory.create({x: 0, y: 0, maxx: 200, maxy: 500})
		const sprp = _2d.positionFactory.create({x: 512, y: 512})
//		const sprp = _2d.positionFactory.create({x: 1024-64, y: 1024-64})
		const sprr = _2d.rotationFactory.create({theta: 0})
//		const sprr = _2d.rotationFactory.create({theta: math.d2r(10)})
		// reverse sprite facing
//		const sprs = _2d.scaleFactory.create({sx: -1, sy: 1})
		const sprres = _2d.resistanceFactory.create({x: 0.95})
		const sprs = _2d.scaleFactory.create({sx: 1, sy: 1})
//		const sprsz = _2d.sizeFactory.create({width: 64, height: 64})
		const sprcc = _2d.centerFactory.create({cx: 0.5, cy: 0.5})
		const sprpc = _2d.positionConstraintsFactory.create({minx: 16, maxx: this.width-16, miny: 32, maxy: this.height-32})
		const sprbody = _2d.physicsBodyFactory.create({aabb:[-32, -15, 32, 15], restitution:1, mass:1})
		// collision group for the player to collide against
		let spre2
		const pcolg = _2d.collisionGroupFactory.create({entities:[spre2]})
		// create the entity
		ecs.manager.get().createEntity([_2d.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, /*sprsz,*/ sprs, sprcc, sprpc, sprc, pcolg, sprres])

		anims.play('walk')

		// create a non-player sprite
		const anims2 = new _2d.AnimationSet()
		anims2.add('jitter', [[8, 250], [9, 250]])
		// eslint-disable-next-line no-undef
		const sbasetexture2 = new PIXI.BaseTexture(s_img)
		// eslint-disable-next-line no-undef
		const stexture2 = new PIXI.Texture(sbasetexture2)
		// eslint-disable-next-line no-undef
		const sprite2 = new PIXI.Sprite(stexture2)
		const sprv2 = _2d.velocityFactory.create({x: -100, y: 0, maxx: 200, maxy: 500})
		game.view.add(sprite2)
		const sprc2 = _2d.spriteFactory.create({sprite:sprite2, width:64, animations:anims2})
		const sprp2 = _2d.positionFactory.create({x: 64, y: 1024-64})
		const sprbody2 = _2d.physicsBodyFactory.create({aabb:[-32, -16, 32, 16], restitution:1, mass:1, resistance_x: 0})
		// create the entity
		spre2 = ecs.manager.get().createEntity([_2d.renderableFactory, gravc, cmc, sprbody2, sprv2, sprp2, /*sprsz,*/ sprs, sprcc, sprpc, sprc2])
		anims2.play('jitter')

		// create a 'billboard' image
		const img = loader.getAsset('logo')
		const imgp = _2d.positionFactory.create({x: WIDTH/2, y: HEIGHT/2})
		const imgr = _2d.rotationFactory.create({theta: 0})
		const imgs = _2d.scaleFactory.create({sx: 1, sy: 1})
		const imgsz = _2d.sizeFactory.create({width: 512, height: 384})
		const imgcc = _2d.centerFactory.create({cx: 0.5, cy: 0.5})
		// eslint-disable-next-line no-undef
		const basetexture = new PIXI.BaseTexture(img)
		// eslint-disable-next-line no-undef
		const texture = new PIXI.Texture(basetexture)
		// eslint-disable-next-line no-undef
		const image = new PIXI.Sprite(texture)
		image.alpha = 0.25
		game.view.add(image, true)
		const imgc = _2d.imageFactory.create({sprite:image})
		ecs.manager.get().createEntity([_2d.renderableFactory, imgp, imgr, imgsz, imgs, imgcc, imgc])

		// draw some text
		// eslint-disable-next-line no-undef
		const txt = new PIXI.BitmapText("foobar", {font: 'Open_Sans', align: 'center'})
		txt.position.x = WIDTH/2 - txt.textWidth/2
		txt.position.y = HEIGHT/2 - txt.textHeight/2
		game.view.add(txt, true)

		// create an emitter
		//
		const emc = emitter.emitterFactory.create({
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
		})
		const empos = _2d.positionFactory.create({x: 700, y: 800})
		ecs.manager.get().createEntity([ emc, empos ])


		// add touchscreen buttons
//		input.touch.start(game, 5)
//		input.touch.addButton(loader.getAsset('left'))

		// set the entities for collision groups
		pcolg.entities = [spre2]

		// follow the player sprite
		game.view.follow_mode = View.FOLLOW_MODE_PLATFORMER
		game.view.target = sprp


		// create an emitter system
		const es = emitter.createEmitterSystem(game.view, 'firefly')
		ecs.manager.get().addSystem(es)

		// create a movement system
		const ms = _2d.createMovementSystem(200)
		ecs.manager.get().addSystem(ms)

//		audio.playSound( 'field', 0, 1, true )
//		audio.playSound( 'theme', 0, 1, true )

		//////////////////
		// add global handlers for web page controls
		window.updateMass = function(value) {
			sprbody.mass = value
		}
		window.updateRestitution = function(value) {
			sprbody.restitution = value
		}
		window.updateResistanceX = function(value) {
			sprres.x = value
		}
		window.updateResistanceY = function(value) {
			sprres.y = value
		}
		window.updateGravity = function(value) {
			gravc.y = value
		}
	},

	destroy : function() { }
}


// create a Tiled map scene using our scene definition object
const scene = new TiledScene(game, 'assets/maps/test.json', myScene)
game.scene = scene

// start the scene
scene.start()

// start the main ecs loop
//z2.main(ecs.ecsUpdate)
function mainloop(et)
{
	stats.begin()
	// TODO: problem with this is that ecsUpdate calculates the time delta, so
	// by intercepting here the dt doesn't get updated properly
	if(!game.paused)
		ecs.ecsUpdate(et)
	stats.end()
}
z2.startMain(mainloop)

})()

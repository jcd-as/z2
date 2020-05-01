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
import * as tilemap from '../../js/tilemap.js'
import * as ecs from '../../js/ecs.js'
import * as _2d from '../../js/2d-pixi.js'


const WIDTH = 512
const HEIGHT = 384

function createScene(game, player)
{
	// create an object defining our scene
	// (load, create and update methods)
	let scene	// we need scene defined because we need to use it in myScene.create()...
	const myScene =
	{
		load : function()
		{
			loader.setFontBaseUrl('assets/img/')
			loader.setImageBaseUrl('assets/img/')
			loader.setAudioBaseUrl('assets/snd/')
			loader.queueAsset('man', 'stylized.png')
			loader.queueAsset('firefly', 'firefly.png', 'spritesheet', 8, 8)
			loader.queueAsset('logo', 'logo.png')
			loader.queueAsset('field', 'field.mp3')
			loader.queueAsset('land', 'landing.mp3')

			loader.queueAsset('font', 'open_sans_italic_20.fnt')
		},

		create : function() {
			// create an 'enemy' component, for enemy 'AI'
			const enemyc = ecs.createComponentFactory()
			// create the enemy system
			const enemy_sys = new ecs.System(100, [enemyc, _2d.velocityFactory, _2d.physicsBodyFactory], {
				init: function() { },
				// eslint-disable-next-line no-unused-vars
				update: function(e, dt) { }
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

			// create a collision map component
			const cmc = tilemap.collisionMapFactory.create({map: this.map, data: this.map.collisionMap})

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
			const sprr = _2d.rotationFactory.create({theta: 0})
			const sprres = _2d.resistanceFactory.create({x: 0.95})
			const sprs = _2d.scaleFactory.create({sx: 1, sy: 1})
			const sprcc = _2d.centerFactory.create({cx: 0.5, cy: 0.5})
			const sprpc = _2d.positionConstraintsFactory.create({minx: 16, maxx: this.width-16, miny: 32, maxy: this.height-32})
			const sprbody = _2d.physicsBodyFactory.create({aabb:[-32, -15, 32, 15], restitution:1, mass:1})
			// collision group for the player to collide against
			let spre2
			const pcolg = _2d.collisionGroupFactory.create({entities:[spre2]})
			// create the entity
			const spre = ecs.manager.get().createEntity([_2d.renderableFactory, gravc, cmc, sprbody, player, sprv, sprp, sprr, sprs, sprcc, sprpc, sprc, pcolg, sprres])

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
			spre2 = ecs.manager.get().createEntity([_2d.renderableFactory, gravc, cmc, sprbody2, sprv2, sprp2, sprs, sprcc, sprpc, sprc2])
			anims2.play('jitter')

			// test 'billboard' images:
//			const img = loader.getAsset('logo')
//			const imgp = _2d.positionFactory.create({x: WIDTH/2, y: HEIGHT/2})
//			const imgr = _2d.rotationFactory.create({theta: 0})
//			const imgs = _2d.scaleFactory.create({sx: 1, sy: 1})
//			const imgsz = _2d.sizeFactory.create({width: 512, height: 384})
//			const imgcc = _2d.centerFactory.create({cx: 0.5, cy: 0.5})
//			// eslint-disable-next-line no-undef
//			const basetexture = new PIXI.BaseTexture(img)
//			// eslint-disable-next-line no-undef
//			const texture = new PIXI.Texture(basetexture)
//			// eslint-disable-next-line no-undef
//			const image = new PIXI.Sprite(texture)
//			image.alpha = 0.25
//			game.view.add(image, true)
//			const imgc = _2d.imageFactory.create({sprite:image})
//			ecs.manager.get().createEntity([_2d.renderableFactory, imgp, imgr, imgsz, imgs, imgcc, imgc])

			// test text drawing:
			// eslint-disable-next-line no-undef
//			const txt = new PIXI.BitmapText("foobar", {font: 'Open_Sans', align: 'center'})
//			txt.position.x = WIDTH/2 - txt.textWidth/2
//			txt.position.y = HEIGHT/2 - txt.textHeight/2
//			game.view.add(txt, true)

			// create a particle emitter
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

			// set the entities for collision groups
			pcolg.entities = [spre2]

			// follow the player sprite
			game.view.follow_mode = View.FOLLOW_MODE_PLATFORMER
			game.view.target = sprp

			// create an emitter system
			const es = emitter.createEmitterSystem(game.view, 'firefly')
			ecs.manager.get().addSystem(es)

			// TODO: need to pass 'scene' as the first arg to 'createMovementSystem',
			// BUT we can't have the scene yet without first having this object...
			// create a movement system
			const ms = _2d.createMovementSystem(scene, 200)
			ecs.manager.get().addSystem(ms)

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

			this.map.objectGroups.push([spre, spre2])
			this.map.updateObjectCollisionMaps()
		},

		destroy : function() { }
	}

	// create a Tiled map scene using our scene definition object
	return new TiledScene(game, 'assets/maps/test.json', myScene)
}

(function()
{
	// stats (FPS display)
	// eslint-disable-next-line no-undef
	var stats = new Stats()
	document.body.appendChild(stats.domElement)
	stats.domElement.style.position = 'absolute'
	stats.domElement.style.top = '0px'

	// global 'game' object
	const div = document.getElementById('canvas')
	const game = new Game(WIDTH, HEIGHT, null /*target*/, View.FOLLOW_MODE_PLATFORMER)
	div.appendChild(game.app.view)

	// pause the game when the browser window loses focus
	const visibilityChange = function(event) {
		if(game.paused === false && (event.type == 'pagehide' || event.type == 'blur' || document.hidden === true || document.webkitHidden === true))
			game.pause()
		else
			game.resume()
	}
	document.addEventListener('visibilitychange', visibilityChange, false)
	document.addEventListener('webkitvisibilitychange', visibilityChange, false)
	document.addEventListener('pagehide', visibilityChange, false)
	document.addEventListener('pageshow', visibilityChange, false)
	window.onblur = visibilityChange
	window.onfocus = visibilityChange


	// create a "player control" component...
	const player = ecs.createComponentFactory()
	// ...and (important!) add it to the game object
	game.player = player

	audio.init()

	// create a scene and start it
	const scene = createScene(game, player)
	game.startScene(scene)

	// start the game running
	zSquared.stats = stats
	game.start()

})()


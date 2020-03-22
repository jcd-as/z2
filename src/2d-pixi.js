// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - physics in movement system: gravity (x), mass (x), friction ( ), 'bounce'
// (coefficient of restitution) (x)
// -

/** 2d Entities, Component Factories and Systems.
 * @module
 */

import * as ecs from './ecs.js'
import * as tilemap from './tilemap.js'
import * as collision from './collision.js'


/////////////////////////////////////////////////////////////////////////
// Component factories
/////////////////////////////////////////////////////////////////////////

/** Component Factory for 2d renderable
* (empty 'dummy' components that just indicate they can be drawn) */
export const renderableFactory = ecs.createComponentFactory()

/** Component Factory for 2d image */
export const imageFactory = ecs.createComponentFactory( {sprite: null} )

/** Component Factory for 2d polygon */
//export const polygonFactory = ecs.createComponentFactory( {vertices: []} );

/** Component Factory for 2d fill type */
//export const fillFactory = ecs.createComponentFactory( {fill: '#ffffff'} );

/** Component to indicate whether an entity is active of not */
export const activeFactory = ecs.createComponentFactory( {active:true} )

/** Component Factory for 2d position */
export const positionFactory = ecs.createComponentFactory( {x: 0, y: 0} )

/** Component Factory for 2d position constraints */
export const positionConstraintsFactory = ecs.createComponentFactory( {minx: 0, maxx:0, miny:0, maxy:0} )

/** Component Factory for 2d size */
export const sizeFactory = ecs.createComponentFactory( {width:0, height:0} )

/** Component Factory for 2d velocity */
export const velocityFactory = ecs.createComponentFactory( {x: 0, y: 0, maxx:1000, maxy:1000} )

/** Component Factory for 2d rotation */
export const rotationFactory = ecs.createComponentFactory( {theta: 0} )

/** Component Factory for 2d scale */
export const scaleFactory = ecs.createComponentFactory( {sx: 1, sy: 1} )

/** Component Factory for 2d center point */
export const centerFactory = ecs.createComponentFactory( {cx: 0.5, cy: 0.5} )

/** Component Factory for 2d radius */
export const radiusFactory = ecs.createComponentFactory( {radius:0} )

/** Component Factory for 2d (animated) sprite */
export const spriteFactory = ecs.createComponentFactory( {sprite: null, width: 0, animations: null } )

/** Component Factory for groups */
//export const groupFactory = ecs.createComponentFactory( {group: []} );

/** Component Factory for physics body (AABB bounds, mass, etc) */
export const physicsBodyFactory = ecs.createComponentFactory( {aabb:null, restitution: 0, mass:1, blocked_top: false, blocked_left:false, blocked_down:false, blocked_right:false, was_blocked_top:false, was_blocked_left:false, was_blocked_bottom:false, was_blocked_right:false, collisionCallback: null} )

/** Component Factory for 2d gravity */
export const gravityFactory = ecs.createComponentFactory( {x: 0, y: 0} )

/** Component Factory for 2d resistance (resistance to movement e.g. air
* resistance, friction, etc) */
export const resistanceFactory = ecs.createComponentFactory( {x: 0, y: 0} )

/** Component Factory for sprite vs sprite collision */
export const collisionGroupFactory = ecs.createComponentFactory( {entities:null} )


/** Helper class for sprite animations. */
export class AnimationSet
{
	animations = {}
	cur_animation = null
	_playing = null
	_cur_frame = 0
	_frame_time = 0

	/** Get the index (in the sprite sheet) of the current frame to be displayed.
	 * @type {number} */
	get currentFrame()
	{
		if(this.cur_animation)
			return this.cur_animation[this._cur_frame][0]
		else
			return 0
	}

	/** Get the name (key) of the current animation, null if none.
	* @type {string} */
	get playing()
	{
		return this._playing
	}

	/** Add an animation sequence
	* @arg {string} name Friendly name of sequence, to be used as look-up key
	* @arg {Array} anim An array containing the frames of the animation
	* sequence, with each frame being a two-element array consisting of the
	* frame index and the ms spent on this frame (e.g. [0, 250])
	*/
	add(name, anim)
	{
		this.animations[name] = anim
	}
	/** Start playing an animation sequence
	* @arg {string} name The (friendly) name of the sequence to play
	*/
	play(name)
	{
		this._playing = name
		this.cur_animation = this.animations[name]
		this._cur_frame = 0
		this._frame_time = 0
	}
	/** Stop playing any animation sequence */
	stop()
	{
		this._playing = null
		this.cur_animation = null
		this._frame_time = 0
	}
	/** Update the current frame given a time delta
	* @arg {number} dt The time delta (elapsed time since last frame)
	*/
	update(dt)
	{
		// if there is an animation playing,
		// find the frame that should be displayed,
		// given the elapsed time
		if(this.cur_animation !== null) {
			this._frame_time += dt
			let f = this._cur_frame
			let next = this.cur_animation[f][1]
			if(this._frame_time < next)
				return
			// calculate the correct frame for the elapsed time
			while(this._frame_time > next) {
				// wrap around to first frame?
				if(f === this.cur_animation.length) {
					this._frame_time -= next
					next = 0
					f = 0
				}
				next += this.cur_animation[f][1]
				f++
			}
				// wrap around to first frame?
				if(f < this.cur_animation.length)
					this._cur_frame = f
				else
					this._cur_frame = 0
				this._frame_time = 0
		}
	}
}

/////////////////////////////////////////////////////////////////////////
// System factories
/////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////
/** RenderingSystem factory function
* requires: renderable. 
* optional: image, sprite, tileLayer, size, rotation, scale, center. 
* (MUST be an image, sprite or tilelayer or nothing can be rendered)
* @arg {Canvas} canvas The HTML5 canvas to draw to
* @arg {View} view The View object for this transform system
* @arg {number} [priority] Priority of system. Override only if you need
* the renderer to NOT run last
*/
// eslint-disable-next-line no-unused-vars
export function createRenderingSystem(canvas, view, force_canvas_rendering, priority)
{
	// TODO: fix global access to 'game'
	// eslint-disable-next-line no-undef
	const stage = game.stage

	return new ecs.System(Number.MAX_VALUE, [renderableFactory], {
		onStart: function()
		{
			view.update()
		},
		update: function(e, dt)
		{
			// get the image...
			let disp = e.getComponent(imageFactory)

			// ...or sprite...
			let anims
			if(!disp) {
				disp = e.getComponent(spriteFactory)
				if(disp)
					anims = disp.animations
			}

			// ...or tile layer...
			if(!disp) {
				disp = e.getComponent(tilemap.tileLayerFactory)
				if(disp) {
					disp.layer.render(view.x, view.y)
					return
				}
			}

			// ...or image layer
			if(!disp) {
				disp = e.getComponent(tilemap.imageLayerFactory)
				if(disp) {
					disp.layer.render(view.x, view.y)
					return
				}
			}

			// can't operate on nothing...
			if(!disp)
				return

			// get the position component
			const pc = e.getComponent( positionFactory )
			const x = pc.x
			const y = pc.y

			// get the size component
			const szc = e.getComponent(sizeFactory)

			// get the rotation component
			const rc = e.getComponent(rotationFactory)

			// get the scale component
			const sc = e.getComponent(scaleFactory)

			// get the center point
			const cc = e.getComponent(centerFactory)

			// get the PIXI sprite
			const spr = disp.sprite

			let w, h, offs

			// set the texture frame, taking animation into account

			// TODO: cache values so that we're not re-setting the frame
			// unnecessarily
			if(szc) {
				w = szc.width
				h = szc.height
			} else
			{
				// sprites have width, images don't
				if(disp.width)
					w = disp.width
				else
					w = spr.width
				h = spr.height
			}
			// offset to the image in the sprite strip
			if(anims) offs = anims.currentFrame * w
			else offs = 0

			// update the current frame & image
			if(anims)
				anims.update(dt)

			// eslint-disable-next-line no-undef
			spr.texture.frame = new PIXI.Rectangle(offs, 0, w, h)
			spr.texture.updateUvs()

			// apply the transforms to the PIXI sprite

			// position
			spr.position.x = x
			spr.position.y = y

			// scale
			if(sc) {
				spr.scale.x = sc.sx
				spr.scale.y = sc.sy
			}

			// rotation
			if(rc)
				spr.rotation = rc.theta

			// center
			if(cc) {
				spr.anchor.x = cc.cx
				spr.anchor.y = cc.cy
			}

			// TODO: check if in View & mark visible 'false' if not
		},
		onEnd: function()
		{
			// TODO: fix global access to 'game'
			game.app.render(stage)
		}
	})
}

/////////////////////////////////////////////////////////////////////////
/** MovementSystem factory function.
* requires: position, velocity.
* optional: positionConstraints, collisionMap, physicsBody (*required* if
* there is a collisionMap or Group), gravity, collisionGroup.
* @arg {number} priority Priority of system (lower = higher priority)
*/
export function createMovementSystem(priority)
{
	return new ecs.System(priority, [positionFactory, velocityFactory], {
		// define these here, access to 'this.foo' generally faster than to
		// 'foo' captured by closure...
		aabb1 : new Float64Array(4),
		aabb2 : new Float64Array(4),
		pv : new Float64Array(2),

		update: function(e, dt)
		{
			// get the position component
			const pc = e.getComponent(positionFactory)

			// get the velocity component
			const vc = e.getComponent(velocityFactory)

			// get the gravity component
			const gc = e.getComponent(gravityFactory)

			// get the resistance component
			const rc = e.getComponent(resistanceFactory)

			// get the pos constraints component
			const pcc = e.getComponent(positionConstraintsFactory)

			// get the collision map component
			const cmc = e.getComponent(tilemap.collisionMapFactory)

			// get the physics body
			const bc = e.getComponent(physicsBodyFactory)

			// get the collision group (sprite vs sprite collisions)
			const cgc = e.getComponent(collisionGroupFactory)

			// get the 'active' component
			const ac = e.getComponent(activeFactory)

			// TODO: get the 'visible' component

			// not active? bail
			if(ac && !ac.active)
				return

			// if the object is out of the world bounds, just bail
			// TODO: set visible to false too? (so PIXI won't render)
			// TODO: don't use global 'game' !!!
			// eslint-disable-next-line no-undef
			if(window.game && game.scene && game.scene.map) {
				let width = 0, height = 0
				// if we have a size component, use it
				const szc = e.getComponent(sizeFactory)
				if(szc) {
					width = szc.width
					height = szc.height
				}
				// otherwise, if we have a physics body, use it
				else if(bc) {
					width = bc.aabb[3] - bc.aabb[1]
					height = bc.aabb[2] - bc.aabb[0]
				}

				// TODO: don't use global 'game' !!!
				// eslint-disable-next-line no-undef
				if(pc.x - width > game.scene.map.worldWidth ||
					// eslint-disable-next-line no-undef
					pc.y - height > game.scene.map.worldHeight)
					return
			}

			// get pos constraints
			let minx = -Number.MAX_VALUE, maxx = Number.MAX_VALUE
			let miny = -Number.MAX_VALUE, maxy = Number.MAX_VALUE
			if(pcc) {
				minx = pcc.minx
				maxx = pcc.maxx
				miny = pcc.miny
				maxy = pcc.maxy
			}

			// dt factor
			const idt = dt / 1000

			// save previous position
//			const px = pc.x
//			const py = pc.y

			// gravity? apply first half prior to changing position
			// (see www.niksula.cs.hut.fi/~hkankaan/Homepages/gravity.html)
			// for an explanation of why we split physics mods into two
			// parts)
			if(gc) {
				vc.x += gc.x * idt * 0.5
				vc.y += gc.y * idt * 0.5
			}
			// cap velocity
			if(vc.x > vc.maxx) vc.x = vc.maxx
			else if(vc.x < -vc.maxx) vc.x = -vc.maxx
			if(vc.y > vc.maxy) vc.y = vc.maxy
			else if(vc.x < -vc.maxy) vc.y = -vc.maxy

			// account for elapsed time since last frame
			let xmod
			if(bc && bc.blocked_left && vc.x < 0)
				xmod = 0
			else if(bc && bc.blocked_right && vc.x > 0)
				xmod = 0
			else
				xmod = vc.x * idt
			let ymod
			if(bc && bc.blocked_up && vc.y < 0)
				ymod = 0
			else if(bc && bc.blocked_down && vc.y > 0)
				ymod = 0
			else
				ymod = vc.y * idt

			// test constraints & set position
			const x = pc.x + xmod
			const y = pc.y + ymod
			// TODO: these should set the 'bc.blocked_X' vars
			if(x > maxx || x < minx)
				vc.x = 0
			else
				pc.x = x
			if(y > maxy || y < miny)
				vc.y = 0
			else
				pc.y = y


			// collisions:

			let m

			// if we have a physics body, handle collision-related things
			if(bc) {
				bc.was_blocked_left = bc.blocked_left
				bc.was_blocked_right = bc.blocked_right
				bc.was_blocked_up = bc.blocked_up
				bc.was_blocked_down = bc.blocked_down

				bc.blocked_left = false
				bc.blocked_right = false
				bc.blocked_up = false
				bc.blocked_down = false

				// handle sprite vs sprite collisions
				if(cgc) {
					// TODO: friction only makes sense for 'full' (non-AABB)
					// collisions (using circles, for example)

					const entities = cgc.entities
					if(entities) {
						// TODO: optimize! figure out a better way to do this,
						// it is potentially n^2 behaviour (e.g. if we need to
						// collide two groups together)
						// (keep a list of already collided sprites?)
						for(let i = 0; i < entities.length; i++) {
							const ent = entities[i]
							const body = ent.getComponent(physicsBodyFactory)
							const pos = ent.getComponent(positionFactory)
							const vel = ent.getComponent(velocityFactory)

							// don't collide against self
							if(bc === body)
								continue

							// setup the bounding boxes
							this.aabb1[0] = bc.aabb[0] + pc.y
							this.aabb1[1] = bc.aabb[1] + pc.x
							this.aabb1[2] = bc.aabb[2] + pc.y
							this.aabb1[3] = bc.aabb[3] + pc.x

							this.aabb2[0] = body.aabb[0] + pos.y
							this.aabb2[1] = body.aabb[1] + pos.x
							this.aabb2[2] = body.aabb[2] + pos.y
							this.aabb2[3] = body.aabb[3] + pos.x

							// collide
							m = collision.collideAabbVsAabb(this.aabb1, this.aabb2, this.pv)

							// separate the aabb and stop velocity
							if(m) {
								// call collision callback, if it exists
								if(bc.collisionCallback && typeof(bc.collisionCallback) == 'function') {
									// call it. if it returns 'true', don't separate
									if(bc.collisionCallback(e, ent))
										continue
								}
								else if(body.collisionCallback && typeof(body.collisionCallback) == 'function') {
									// call it. if it returns 'true', don't separate
									if(body.collisionCallback(ent, e))
										continue
								}

								// separate
								pc.x += this.pv[0]
								pc.y += this.pv[1]

								// m = mass, u = init vel, v = resultant vel
								// cr = coefficient of restitution
								// from wikipedia:
								// (http://en.wikipedia.org/wiki/Coefficient_of_restitution#Speeds_after_impact)
								// v1 = [(m1)(u1) + (m2)(u2) + (m2)(cr)(u2-u1)] / (m1+m2)
								// v2 = [(m1)(u1) + (m2)(u2) + (m1)(cr)(u1-u2)] / (m1+m2)

								const m1 = bc.mass
								const m2 = body.mass
								const mt = m1 + m2

								let u1, u2, term

								// CoR is a properly a property of a *collision*,
								// not an object... we'll just take the average
								const cr = (bc.restitution + body.restitution) / 2

								// left separation
								if(this.pv[0] < 0) {
									u1 = vc.x; u2 = vel.x
									term = (m1*u1)+(m2*u2)
									vc.x = (term + (m2*cr) * (u2-u1)) / mt
									vel.x = (term + (m1*cr) * (u1-u2)) / mt
									bc.blocked_right = true
									body.blocked_left = true
								}
								// right separation
								if(this.pv[0] > 0) {
									u1 = vc.x; u2 = vel.x
									term = (m1*u1)+(m2*u2)
									vc.x = (term + (m2*cr) * (u2-u1)) / mt
									vel.x = (term + (m1*cr) * (u1-u2)) / mt
									bc.blocked_left = true
									body.blocked_right = true
								}
								// up separation
								if(this.pv[1] < 0) {
									u1 = vc.y; u2 = vel.y
									term = (m1*u1)+(m2*u2)
									vc.y = (term + (m2*cr) * (u2-u1)) / mt
									vel.y = (term + (m1*cr) * (u1-u2)) / mt
									bc.blocked_down = true
									body.blocked_up = true
								}
								// down separation
								if(this.pv[1] > 0) {
									u1 = vc.y; u2 = vel.y
									term = (m1*u1)+(m2*u2)
									vc.y = (term + (m2*cr) * (u2-u1)) / mt
									vel.y = (term + (m1*cr) * (u1-u2)) / mt
									bc.blocked_up = true
									body.blocked_down = true
								}
							}
						}
					}
				}

				// handle collision with collision map
				if(cmc) {
					// TODO: non-AABB collision body??

					// TODO: friction only makes sense for 'full' (non-AABB)
					// collisions (using circles, for example)

					this.aabb1[0] = bc.aabb[0] + pc.y
					this.aabb1[1] = bc.aabb[1] + pc.x
					this.aabb1[2] = bc.aabb[2] + pc.y
					this.aabb1[3] = bc.aabb[3] + pc.x

					// perform the collision
					m = collision.collideAabbVsCollisionMap(this.aabb1, cmc.data, cmc.map.widthInTiles, cmc.map.heightInTiles, cmc.map.tileWidth, cmc.map.tileHeight, this.pv)

					// separate the aabb and stop velocity
					if(m) {
						pc.x += this.pv[0]
						pc.y += this.pv[1]

						// set velocity & 'blocked' in direction of collision

						// left
						if(this.pv[0] > 0) {
							vc.x = vc.x * -bc.restitution
							bc.blocked_left = true
						}
						// right
						else if(this.pv[0] < 0) {
							vc.x = vc.x * -bc.restitution
							bc.blocked_right = true
						}
						// top
						else if(this.pv[1] > 0) {
							vc.y = vc.y * -bc.restitution
							bc.blocked_up = true
						}
						// bottom
						else if(this.pv[1] < 0) {
							vc.y = vc.y * -bc.restitution
							bc.blocked_down = true
						}
					}
				}
			}

			// apply basic "air resistance" friction-like component
			if(rc) {
				vc.x *= 1 - rc.x * idt
				vc.y *= 1 - rc.y * idt
			}

			// gravity? apply second half after changing position
			// (see www.niksula.cs.hut.fi/~hkankaan/Homepages/gravity.html)
			// for an explanation of why we split physics mods into two
			// parts)
			if(gc) {
				vc.x += gc.x * idt * 0.5
				vc.y += gc.y * idt * 0.5
			}
			// cap velocity
			if(vc.x > vc.maxx) vc.x = vc.maxx
			else if(vc.x < -vc.maxx) vc.x = -vc.maxx
			if(vc.y > vc.maxy) vc.y = vc.maxy
			else if(vc.x < -vc.maxy) vc.y = -vc.maxy
		}
	})
}


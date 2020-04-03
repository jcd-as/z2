// ecs.js
// Copyright 2013 Joshua C Shepard
// Entity-Component-System framework for zed-squared
//
// TODO:
// - Systems onStart & onEnd are called regardless of whether they currently
// have any (active) entities that update will be called on...
// - test dead/dying lists & removing/adding Entities during main loop
// -

/** Entity-Component-System module.
 * @module
 */

import * as bitset from'./bitset.js'


/** @constant */
const DEFAULT_NUM_ENTITIES = 64

/** Decorating factory function to create Component Factories
* @arg {Object} obj An object to turn into a Component type
* (by decorating with a unique mask)
*/
export const createComponentFactory = (function()
{
	let next_bit = 0
	let next_type_id = 0
	return function(obj)
	{
		if(next_bit > bitset.MAX_BITSET_BITS)
			throw new Error("Trying to create too many components")

		const mask = new bitset.Bitset(bitset.DEFAULT_BITSET_LENGTH)
		mask.setBit(next_bit++)
		const type_id = next_type_id++
			return {
			mask : mask,
			typeId : type_id,
			create : function(overrides)
			{
				// TODO: set directly on a new object instead of on the
				// object's prototype ?
				let o
				if(obj)
					o = Object.create(obj)
				else
					o = {}
				// apply overrides
				for(let key in overrides) {
					// eslint-disable-next-line no-prototype-builtins
					if(overrides.hasOwnProperty(key) && obj.hasOwnProperty(key))
						o[key] = overrides[key]
				}
				o.mask = mask
				o.typeId = type_id
				return o
			}
		}
	}
})()


/** Decorating class to create System types. */
export class System
{
	/**
	* @constructor
	* @arg {number} pri Priority of the System. Systems are run in priority
	* order, low to high (0 to [max number])
	* @arg {Array} cmps An array of the Components that define the Entities on
	* which this System will be called
	* @arg {Object} obj The prototype for the System. Must contain the
	* following function:
	* update( e, dt ) - The function which will be called each frame. Takes an
	* entity and the time delta for the frame as arguments
	* and may optionally contain:
	* init() - An initializer that is called when the System is first created
	* for use
	* onStart() - A function that will be called at the beginning of each frame
	* onEnd() - A function that will be called at the end of each frame
	*/
	constructor(priority, cmps, obj)
	{
		this.priority = priority

		// copy properties from the object
		for(let key in obj) {
			// eslint-disable-next-line no-prototype-builtins
			if(obj.hasOwnProperty(key))
				this[key] = obj[key]
		}

		// create the mask for these Components
		this.mask = new bitset.Bitset(bitset.DEFAULT_BITSET_LENGTH)
		for(let i = 0; i < cmps.length; i++) {
			this.mask.setBits(cmps[i].mask)
		}

		// list of entities currently operated on by this System
		this.entities = []
	}

	// remove an Entity
	removeEntity(e)
	{
		const i = this.entities.indexOf(e)
		if(i !== -1)
			this.entities.splice(i, 1)
	}

	// check to see if an entity should be operated on by this System, and add
	// it to our collection if so
	addEntityIfMatch(e)
	{
		if(this.mask.matchAll(e.mask)) {
			// don't add duplicates
			const i = this.entities.indexOf(e)
			if(i === -1)
				this.entities.push(e)
		}
	}

	// remove an Entity if it doesn't match this system
	removeEntityIfNotMatch(e)
	{
		if(!this.mask.matchAll(e.mask)) {
			const i = this.entities.indexOf(e)
			if(i !== -1)
				this.entities.splice(i, 1)
		}
	}

	onUpdate(dt)
	{
		// update all our entities
		for(let i = 0; i < this.entities.length; i++) {
			this.update(this.entities[i], dt)
		}
	}
}


/** Name component factory for Entities. */
export let nameFactory = createComponentFactory({name: null})

/** Entity class */
export class Entity
{
	/**
	* @constructor
	* @arg {Number} id The (unique) identifier for this Entity
	*/
	constructor(id)
	{
		this.id = id
		this.mask = new bitset.Bitset(bitset.DEFAULT_BITSET_LENGTH)
	}

	/** Return the Entity's Component with a given mask.
	* @arg {ComponentFactory} cmp The Factory of the Component to retrieve
	*/
	getComponent(cmp)
	{
		return manager.get().getComponent(this.id, cmp)
	}

	/** Clear mask. */
	clearMask()
	{
		this.mask.clear()
	}

	/** Reset mask. */
	resetMask()
	{
		this.mask.clear()
		const cmps = manager.get().getComponents(this.id)
		for(let key in cmps) {
			// eslint-disable-next-line no-prototype-builtins
			if(!cmps.hasOwnProperty(key))
				continue
			this.mask.setBits(cmps[key].mask)
		}
	}

	/** Set the Components for the Entity.
	* @arg {Array} cmps The list of Components that comprise this Entity
	*/
	setComponents(cmps)
	{
		for(let i = 0; i < cmps.length; i++) {
			manager.get().setComponent(this.id, cmps[i])
			this.mask.setBits(cmps[i].mask)
		}
	}

	/** Add a Component to the Entity.
	* @arg {Component} c The Component to add
	*/
	addComponent(c)
	{
		// add the Component to the list
		manager.get().setComponent(this.id, c)
		// reset our mask
		this.resetMask()
		// update Systems
		manager.get().updateSystems(this)
	}

	/** Remove a Component from the Entity.
	* @arg {Component} c The Component to remove
	*/
	removeComponent(c)
	{
		manager.get().unsetComponent(this.id, c)
		// reset our mask
		this.resetMask()
		// update Systems
		manager.get().updateSystems(this)
	}
}


/** Manager object (singleton) for the Entity-Component-System framework.
 * Provides access to a singleton of the 'ecs.Manager' class.
 * @alias module:ecs.manager
 * @namespace
 */
export const manager = (function() {
	let instance

	/** Manager class (singleton) for the Entity-Component-System framework. */
	class Manager
	{
		// private data/functionality:
		//
		// array of indices of dead (ready to be recycled) Entities
		dead = []
		// array of indices of dying (will be dead at end of frame) Entities
		dying = []
		// array of indices of the living/active Entities
		living = []

		// array of Entity ids to maps of mask-keys to Components
		// e.g. [ {mask1 : component1, mask2 : component2}, ...]
		components = new Array(DEFAULT_NUM_ENTITIES)

		// populate a list of Entities
		entities = new Array(DEFAULT_NUM_ENTITIES)

		// array of systems
		systems = []

		constructor()
		{
			for(let i = 0; i < DEFAULT_NUM_ENTITIES; i++) {
				this.entities[i] = new Entity(i)
				this.dead[i] = i
				this.components[i] = {}
			}
		}

		getNextAvailableEntity()
		{
			let i
			// do we have any empty slots?
			let slot = -1
			// if not, extend our array
			if(this.dead.length === 0) {
				// double the number of entities we can store
				const old_len = this.entities.length
				this.entities.length *= 2
				for(i = old_len; i < this.entities.length; i++) {
					this.entities[i] = new Entity(i)
					this.components[i] = {}
					this.dead.push( i )
				}
				slot = this.dead[this.dead.length-1]
			}
			// if so, get the Entity there and set its components
			else {
				slot = this.dead[this.dead.length-1]
				this.dead.pop()
			}

			const e = this.entities[slot]
			this.living.push(slot)

			return e
		}

		// public data/functionality:

		/** Create an Entity with the given component set.
		* @arg {Array} cmps The array of Components which belong to this Entity
		*/
		createEntity(cmps)
		{
			// get the next available entity from our slots
			const e = this.getNextAvailableEntity()

			// add the components and create the mask for this Entity
			if(cmps)
				e.setComponents(cmps)

			// find all the Systems with matching masks and add
			// this Entity to them
			for(let i = 0; i < this.systems.length; i++) {
				this.systems[i].addEntityIfMatch(e)
			}

			return e
		}

		/** Remove an Entity.
		* @arg {Entity} e The Entity to remove
		*/
		removeEntity(e)
		{
			// update the systems
			for(let i = 0; i < this.systems.length; i++) {
				this.systems[i].removeEntity(e)
			}

			const idx = this.entities.indexOf(e)

			// remove the Entity from the living list
			const li = this.living.indexOf(idx)
			this.living.slice(li)
			// and add it to the dying list
			this.dying.push(idx)

			// clear the Entity slot
			this.entities[idx].clearMask()
			this.components[idx] = {}
		}

		/** Create a copy of an Entity.
		* @arg {Entity} e The Entity to copy from
		* @returns {Entity} A copy of this Entity, wih a new ID
		*/
		copyEntity(e)
		{
			// get the next available entity from our slots
			const copy = this.getNextAvailableEntity()

				// add the components and create the mask for this Entity
				const cmps = this.getComponents(e.id)
				copy.setComponents(cmps)

				// find all the Systems with matching masks and add
				// this Entity to them
				for(let i = 0; i < this.systems.length; i++) {
					this.systems[i].addEntityIfMatch(copy)
				}

			return copy
		}

		/** Get an Entity by id. Only finds *living* entities.
		* @arg {Number} id Unique Id of Entity desired
		* @returns {Entity} Entity, null if not found
		*/
		getEntityById(id)
		{
			for(let i = 0; i < this.living.length; i++) {
				if(this.living[i] === id)
					return this.entities[this.living[i]]
			}
			return null
		}

		/** Get an Entity by name. Only finds *living* entities.
		* @arg {String} name Name of Entity desired (name component)
		* @returns {Entity} Entity, null if not found
		*/
		getEntityByName(name)
		{
			for(let i = 0; i < this.living.length; i++) {
				// check for a name component
				const e = this.entities[this.living[i]]
				const nc = e.getComponent(nameFactory)
				if(nc && nc.name === name)
					return e
			}
			return null
		}

		/** Add a System.
		* @arg {System} sys The System to add
		*/
		addSystem(sys)
		{
			// perform insertion sort using priority as key
			this.systems.push(sys)
				let i, j, temp
				let idx = this.systems.length-1
				while(idx) {
					i = idx
					j = --idx
					if(this.systems[i].priority < this.systems[j].priority) {
						temp = this.systems[i]
						this.systems[i] = this.systems[j]
						this.systems[j] = temp
					}
				}

			if(sys.init && typeof( sys.init ) === 'function')
				sys.init()
				// find all the entities with matching masks and
				// assign them to the System
				for(i = 0; i < this.living.length; i++) {
					sys.addEntityIfMatch(this.entities[this.living[i]])
				}
		}

		/** Update all Systems for an Entities current Component set.
		* @arg {Entity} e The Entity to update the Systems against
		*/
		updateSystems(e)
		{
			for(let i = 0; i < this.systems.length; i++) {
				// if the Entity no longer matches the system, remove it
				this.systems[i].removeEntityIfNotMatch(e)
				// if the Entity does match the system, add it
				this.systems[i].addEntityIfMatch(e)
			}
		}

		/** Get a Component.
		* @arg {number} id Id of the Entity whose Component we want
		* @arg {ComponentFactory} cmp The Factory of the Component we want
		*/
		getComponent(id, cmp)
		{
			return this.components[id][cmp.typeId]
		}

		/** Set a Component.
		* @arg {number} id Id of the Entity whose Component we're setting
		* @arg {Component} cmp Component we're setting
		*/
		setComponent(id, cmp)
		{
			this.components[id][cmp.typeId] = cmp
		}

		/** Unset (remove) a Component.
		* @arg {number} id Id of the Entity whose Component we're un-setting
		* @arg {ComponentFactory} cmp The Factory or Component we're un-setting
		*/
		unsetComponent(id, cmp)
		{
			delete this.components[id][cmp.typeId]
		}

		/** Get the Components for a given Entity.
		* @arg {number} id The id for the Entity whose Component set to get
		*/
		getComponents(id)
		{
			return this.components[id]
		}

		/** Update the ECS engine for this frame.
		* @arg {number} dt Time delta (in milliseconds) since the last update
		*/
		update(dt)
		{
			let i
			// onStart: call each System
			for(i = 0; i < this.systems.length; i++) {
				if(this.systems[i].onStart)
					this.systems[i].onStart()
			}
			// update: call each System
			for(i = 0; i < this.systems.length; i++) {
				this.systems[i].onUpdate(dt)
			}
			// onEnd: call each System
			for(i = 0; i < this.systems.length; i++) {
				if(this.systems[i].onEnd)
					this.systems[i].onEnd()
			}

			// move dying Entities to dead list,
			// so they can be reclaimed/recycled
			for(i = this.dying.length-1; i >= 0; i--) {
				this.dead.push(this.dying.pop());
			}
		}
	}

	return new class
	{
		/** Return the singleton manager object.
		 * @name module:ecs.manager#get
		 * @function
		 */
		get()
		{
			if(!instance)
				instance = new Manager()
			return instance
		}
		/** Reset the singleton manager object to null.
		 * @name module:ecs.manager#reset
		 * @function
		 */
		reset()
		{
			instance = null
		}
	}
})()


/** Main loop for Entity-Component-System based games
* @arg {Number} et The elapsed time passed to requestAnimationFrame
*/
export const ecsUpdate = (function() {
	let pt = 0
	return et => {
		if(pt === 0)
			pt = et

		// cap time delta at 1/10th of a second
		let dt = et - pt
		if(dt > 100)
			dt = 100
		// update the ecs system
		manager.get().update(dt)

		// next frame
		pt = et
	}
})()


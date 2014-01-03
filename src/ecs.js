// ecs.js
// Copyright 2013 Joshua C Shepard
// Entity-Component-System framework for zed-squared
//
// TODO:
// - Systems collection (in manager) should be a priority queue so that higher
// priority items can be added after lower ones (currently it runs them in
// order, so Systems have to be added in priority order)
// - test dead/dying lists & removing/adding Entities during main loop
// - 

"use strict";

zSquared.ecs = function( z2 )
{
	z2.require( ["bitset"] );

	/** @constant */
	z2.DEFAULT_NUM_ENTITIES = 64;

	/** 
	 * Decorating factory function to create Component Factories
	 * @function z2.createComponentFactory
	 * @arg {Object} obj An object to turn into a Component type
	 * (by decorating with a unique mask)
	 */
	z2.createComponentFactory = (function()
	{
		var next_bit = 0;
		return function( obj )
		{
			if( next_bit > z2.MAX_BITSET_BITS )
				throw new Error( "Trying to create too many components" );
			
			var mask = new z2.Bitset( z2.DEFAULT_BITSET_LENGTH );
			mask.setBit( next_bit++ );
			return {
				mask : mask,
				create : function( overrides )
				{
					// TODO: set directly on a new object instead of on the 
					// object's prototype ?
					var o;
					if( obj )
						o = Object.create( obj );
					else
						o = {};
					// apply overrides
					for( var key in overrides )
					{
						if( overrides.hasOwnProperty( key ) && obj.hasOwnProperty( key ) )
							o[key] = overrides[key];
					}
					o.mask = mask;
					return o;
				}
			};
		};
	})();


	/** 
	 * @class z2#z2.System
	 * @classdesc Decorating class to create System types
	 * @constructor
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
	z2.System = function( cmps, obj )
	{
		// copy properties from the object
		for( var key in obj )
		{
			if( obj.hasOwnProperty( key ) )
				this[key] = obj[key];
		}

		// create the mask for these Components
		this.mask = new z2.Bitset( z2.DEFAULT_BITSET_LENGTH );
		for( var i = 0; i < cmps.length; i++ )
		{
			this.mask.setBits( cmps[i].mask );
		}

		// list of entities currently operated on by this System
		this.entities = [];
	};
	// remove an Entity
	z2.System.prototype.removeEntity = function( e )
	{
		var i = this.entities.indexOf( e );
		if( i !== -1 )
			this.entities.splice( i );
	};
	// check to see if an entity should be operated on by this System, and add
	// it to our collection if so
	z2.System.prototype.addEntityIfMatch = function( e )
	{
		if( this.mask.matchAll( e.mask ) )
		{
			// don't add duplicates
			var i = this.entities.indexOf( e );
			if( i === -1 )
				this.entities.push( e );
		}
	};
	// remove an Entity if it doesn't match this system
	z2.System.prototype.removeEntityIfNotMatch = function( e )
	{
		if( !this.mask.matchAll( e.mask ) )
		{
			var i = this.entities.indexOf( e );
			if( i !== -1 )
				this.entities.splice( i );
		}
	};
	z2.System.prototype.onUpdate = function ( dt )
	{
		// update all our entities
		for( var i = 0; i < this.entities.length; i++ )
		{
			this.update( this.entities[i], dt );
		}
	};


	/** 
	 * @class z2#z2.Entity
	 * @classdesc Entity class
	 * @constructor
	 * @arg {Number} id The (unique) identifier for this Entity
	 */
	z2.Entity = function( id )
	{
		this.id = id;
		this.mask = new z2.Bitset( z2.DEFAULT_BITSET_LENGTH );
	};
	/** Return the Entity's Component with a given mask
	 * @method z2.Entity#getComponent
	 * @memberof z2.Entity
	 * @arg {z2.Bitset} mask The mask of the Component to retrieve
	 */
	z2.Entity.prototype.getComponent = function( mask )
	{
		return z2.manager.get().getComponent( this.id, mask );
	};
	/** Clear mask
	 * @method z2.Entity#clearMask
	 * @memberof z2.Entity
	 */
	z2.Entity.prototype.clearMask = function()
	{
		this.mask.clear();
	};
	/** Reset mask
	 * @method z2.Entity#resetMask
	 * @memberof z2.Entity
	 */
	z2.Entity.prototype.resetMask = function()
	{
		this.mask.clear();
		var cmps = z2.manager.get().getComponents( this.id );
		for( var key in cmps )
		{
			if( !cmps.hasOwnProperty( key ) )
				continue;
			this.mask.setBits( cmps[key].mask );
		}
	};
	/** Set the Components for the Entity
	 * @method z2.Entity#setComponents
	 * @memberof z2.Entity
	 * @arg {Array} cmps The list of Components that comprise this Entity
	 */
	z2.Entity.prototype.setComponents = function( cmps )
	{
		for( var i = 0; i < cmps.length; i++ )
		{
			z2.manager.get().setComponent( this.id, cmps[i] );
			this.mask.setBits( cmps[i].mask );
		}
	};
	/** Add a Component to the Entity
	 * @method z2.Entity#addComponent
	 * @memberof z2.Entity
	 * @arg {Component} c The Component to add
	 */
	z2.Entity.prototype.addComponent = function( c )
	{
		// add the Component to the list
		z2.manager.get().setComponent( this.id, c );
		// reset our mask
		this.resetMask();
		// update Systems
		z2.manager.get().updateSystems( this );
	};

	/** Remove a Component from the Entity
	 * @method z2.Entity#removeComponent
	 * @memberof z2.Entity
	 * @arg {Component} c The Component to remove, or its mask (Bitset)
	 */
	z2.Entity.prototype.removeComponent = function( c )
	{
		var mask;
		if( c instanceof z2.Bitset )
			mask = c;
		else
			mask = c.mask;
		// remove the Component to the list
		z2.manager.get().unsetComponent( this.id, mask );
		// reset our mask
		this.resetMask();
		// update Systems
		z2.manager.get().updateSystems( this );
	};

	/** Manager class (singleton) for the Entity-Component-System framework
	 * @namespace
	 */
	z2.manager = (function()
	{
		var instance;
		/** Manager class (singleton) for the Entity-Component-System framework
		 * @class z2.manager
		 */
		function init()
		{
			// private data/functionality:
			//
			// array of indices of dead (ready to be recycled) Entities
			var dead = [];
			// array of indices of dying (will be dead at end of frame) Entities
			var dying = [];
			// array of indices of the living/active Entities
			var living = [];

			// array of Entity ids to maps of mask-keys to Components
			// e.g. [ {mask1 : component1, mask2 : component2}, ...]
			var components = new Array( z2.DEFAULT_NUM_ENTITIES );

			// populate a list of Entities
			var entities = new Array( z2.DEFAULT_NUM_ENTITIES );
			for( var i = 0; i < z2.DEFAULT_NUM_ENTITIES; i++ )
			{
				entities[i] = new z2.Entity( i );
				dead[i] = i;
				components[i] = {};
			}

			// array of systems
			var systems = [];

			// public data/functionality:
			return {
				/** Create an Entity with the given component set
				 * @method z2.manager#createEntity
				 * @memberof z2.manager
				 * @arg {Array} cmps The array of Components which belong to 
				 * this Entity
				 */
				createEntity : function( cmps )
				{
					var i;
					// do we have any empty slots?
					var slot = -1;
					// if not, extend our array
					if( dead.length === 0 )
					{
						// double the number of entities we can store
						var old_len = entities.length;
						entities.length *= 2;
						for( i = old_len; i < entities.length; i++ )
						{
							entities[i] = new z2.Entity( i );
							components[i] = {};
							dead[i] = i;
						}
						slot = entities.length - 1;
					}
					// if so, get the Entity there and set its components
					else
					{
						slot = dead.length - 1;
						dead.pop();
					}

					var e = entities[slot];
					living.push( slot );

					// add the components and create the mask for this Entity
					if( cmps )
					{
						e.setComponents( cmps );
					}

					// find all the Systems with matching masks and add 
					// this Entity to them
					for( i = 0; i < systems.length; i++ )
					{
						systems[i].addEntityIfMatch( e );
					}

					return e;
				},

				/** Remove an Entity
				 * @method z2.manager#removeEntity
				 * @memberof z2.manager
				 * @arg {Entity} e The Entity to remove
				 */
				removeEntity : function( e )
				{
					// update the systems
					for( var i = 0; i < systems.length; i++ )
					{
						systems[i].removeEntity( e );
					}

					var idx = entities.indexOf( e );

					// remove the Entity from the living list
					var li = living.indexOf( idx );
					living.slice( li );
					// and add it to the dying list
					dying.push( idx );

					// clear the Entity slot
					entities[idx].clearMask();
					delete components[idx];
				},

				/** Add a System
				 * @method z2.manager#addSystem
				 * @arg {z2.System} sys The System to add
				 */
				addSystem : function( sys )
				{
					systems.push( sys );
					if( sys.init && typeof( sys.init ) === 'function' )
						sys.init();
					// TODO: find all the entities with matching masks and 
					// assign them to the System
					for( var i = 0; i < living.length; i++ )
					{
						sys.addEntityIfMatch( entities[living[i]] );
					}
				},

				/** Update all Systems for an Entities current Component set
				 * @method z2.manager#updateSystems
				 * @arg {z2.Entity} e The Entity to update the Systems against
				 */
				updateSystems : function( e )
				{
					for( var i = 0; i < systems.length; i++ )
					{
						// if the Entity no longer matches the system, remove it
						systems[i].removeEntityIfNotMatch( e );
						// if the Entity does match the system, add it
						systems[i].addEntityIfMatch( e );
					}
				},

				/** Get a Component
				 * @method z2.manager#getComponent
				 * @arg {number} id Id of the Entity whose Component we want
				 * @arg {z2.Bitset} mask Mask of the Component we want
				 */
				getComponent : function( id, mask )
				{
					return components[id][mask.key];
				},

				/** Set a Component
				 * @method z2.manager#setComponent
				 * @arg {number} id Id of the Entity whose Component we're setting
				 * @arg {z2.Component} cmp Component we're setting
				 */
				setComponent : function( id, cmp )
				{
					components[id][cmp.mask.key] = cmp;
				},

				/** Unset (remove) a Component
				 * @method z2.manager#unsetComponent
				 * @arg {number} id Id of the Entity whose Component we're un-setting
				 * @arg {z2.Bitset} mask The mask of the Component we're un-setting
				 */
				unsetComponent : function( id, mask )
				{
					delete components[id][mask.key];
				},

				/** Get the Components for a given Entity
				 * @method z2.manager#getComponents
				 * @arg {number} id The id for the Entity whose Component set to get
				 */
				getComponents : function( id )
				{
					return components[id];
				},

				/** Update the ECS engine for this frame
				 * @method z2.manager#update
				 * @arg {number} dt Time delta (in milliseconds) since the last 
				 * update
				 */
				update : function( dt )
				{
					var i;
					// onStart: call each System
					for( i = 0; i < systems.length; i++ )
					{
						if( systems[i].onStart )
							systems[i].onStart();
					}
					// update: call each System
					for( i = 0; i < systems.length; i++ )
					{
						systems[i].onUpdate( dt );
					}
					// onEnd: call each System
					for( i = 0; i < systems.length; i++ )
					{
						if( systems[i].onEnd )
							systems[i].onEnd();
					}

					// move dying Entities to dead list, 
					// so they can be reclaimed/recycled
					var idx;
					for( i = dying.length-1; i >= 0; i-- )
					{
						dead.push( dying.pop() );
					}
				}
			};
		}
		
		return {
			/** Return the singleton manager object
			 * @function z2.manager#get
			 */
			get : function()
			{
				if( !instance )
					instance = init();
				return instance;
			}
		};
	})();
};


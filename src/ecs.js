// ecs.js
// Copyright 2013 Joshua C Shepard
// Entity-Component-System framework for zed-squared
//
// TODO:
// - Systems collection (in manager) should be a priority queue so that higher
// priority items can be added after lower ones (currently it runs them in
// order, so Systems have to be added in priority order)
// - Systems should keep lists of the Entities they are associated with and use
// component add/remove events (from the Entities) to keep up-to-date. This will
// allow the Systems to iterate through their list of Entities much more quickly
// (don't have to check the masks of every single Entity for every single
// System: n^2 behavior)
// - 

"use strict";

zSquared.ecs = function( z2 )
{
	z2.require( ["bitset"] );

	/** const */
	z2.DEFAULT_NUM_ENTITIES = 64;

	/** 
	 * Decorating factory function to create Component Factories
	 * @function z2#z2.createComponent
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
	 * update( e ) - The function which will be called each frame. Takes an
	 * entity as an argument
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
	};
	z2.System.prototype.onUpdate = function ( e )
	{
		// TODO: do away with this check once the Systems maintain a list of
		// the components they care about...
		// call 'this.update()' IF the component masks match
		if( this.mask.matchAll( e.mask ) )
			this.update( e );
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
	 * @method z2.Entity#reset
	 * @memberof z2.Entity
	 * @arg {z2.Bitset} mask The mask of the Component to retrieve
	 */
	z2.Entity.prototype.getComponent = function( mask )
	{
		return z2.manager.get().getComponent( this.id, mask );
	};
	/** Reset mask and components
	 * @method z2.Entity#reset
	 * @memberof z2.Entity
	 */
	z2.Entity.prototype.reset = function()
	{
		this.mask.clear();
	};
	/** Set the Components for the Entity
	 * @method z2.Entity#setComponents
	 * @memberof z2.Entity
	 */
	z2.Entity.prototype.setComponents = function( cmps )
	{
		for( var i = 0; i < cmps.length; i++ )
		{
			z2.manager.get().setComponent( this.id, cmps[i] );
			this.mask.setBits( cmps[i].mask );
		}
	};


	/** 
	 * @class z2#z2.manager
	 * @classdesc manager class (singleton) for the Entity-Component-System 
	 * framework
	 * @constructor
	 */
	z2.manager = (function()
	{
		var instance;
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

					// TODO: find all the Systems with matching masks and add 
					// this Entity to them

					return e;
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
					// TODO: this is n^2. System's need to keep their own
					// (up-to-date) list of Entities - then they can only call
					// the necessary ones...
					for( i = 0; i < systems.length; i++ )
					{
						for( var j = 0; j < living.length; j++ )
							systems[i].onUpdate( entities[living[j]] );
					}
					// onEnd: call each System
					for( i = 0; i < systems.length; i++ )
					{
						if( systems[i].onEnd )
							systems[i].onEnd();
					}
				}
			};
		}
		
		return {
			/** Return the singleton manager object
			 * @method z2.manager#get
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


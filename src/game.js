// game.js
// Copyright 2014 Joshua C Shepard
// main 'game' object for the z-squared engine
//
// TODO:
// - 

zSquared.game = function( z2 )
{
	"use strict";

	z2.require( ["2d"] );

	// enable debug data?
	var _debug = true;

	// the main ecs loop
	function mainloop( et )
	{
		if( _debug && z2.stats )
			z2.stats.begin();

		// TODO: problem with this is that ecsUpdate calculates the time delta, so
		// by intercepting here the dt doesn't get updated properly
		if( !game.paused )
		{
			// update the scene
			// (lets it implement any non-ECS behaviour it wants)
			if( game.scene && game.scene.ready )
				game.scene.update();

			// update the ECS system
			z2.ecsUpdate( et );
		}

		if( _debug && z2.stats )
			z2.stats.end();
	}

	/** 
	 * @class z2#z2.Game
	 * @classdesc Game class - this is where it all starts
	 * @constructor
	 * @arg {Canvas} canvas The HTML5 Canvas on which to draw the game
	 * @arg {boolean} [force_canvas] Should we force the use of the Canvas
	 * renderer (disabling WebGL)?
	 */
	z2.Game = function( canvas, force_canvas )
	{
		this.canvas = canvas;
		this.force_canvas = force_canvas || false;
		this.paused = false;
		this.scene = null;

		window.game = this;

		// TODO: support different widths/heights than the canvas'
		if( force_canvas )
			this.renderer = new PIXI.CanvasRenderer( canvas.width, canvas.height, canvas, true );
		else
			this.renderer = PIXI.autoDetectRenderer( canvas.width, canvas.height, canvas, true );

		// create a Pixi stage for everything to be drawn on
		this.stage = new PIXI.Stage( 0x800000 );
		this.stage.interactive = false;

		// create a view with some default values
		this.view = new z2.View( this.canvas.width, this.canvas.height );

		// setup handlers for visibility change events (pause game when focus is
		// lost)
		this.paused = false;
		var that = this;
		var visibilityChange = function( event )
		{
			if( that.paused === false && (event.type == 'pagehide' || event.type == 'blur' || document.hidden === true || document.webkitHidden === true))
				that.paused = true;
			else
				that.paused = false;

			if( that.paused )
			{
				z2.time.pause();
				z2.pauseSounds();
			}
			else
			{
				z2.resumeSounds();
				z2.time.resume();
			}
		};
		document.addEventListener( 'visibilitychange', visibilityChange, false );
		document.addEventListener( 'webkitvisibilitychange', visibilityChange, false );
		document.addEventListener( 'pagehide', visibilityChange, false );
		document.addEventListener( 'pageshow', visibilityChange, false );
		window.onblur = visibilityChange;
		window.onfocus = visibilityChange;
	};

	/** Start the main loop
	 * @function z2.Game#start
	 */
	z2.Game.prototype.start = function()
	{
		// start the main game loop
		z2.main( mainloop );
	};

	/** Start a scene by name or object
	 * @function z2.Game#startScene
	 * @arg {z2.Scene|Function} scene The Scene object or the function to create
	 * the Scene object which to start. If it is a function, any remaining args
	 * will be passed to the function
	 */
	z2.Game.prototype.startScene = function ( scene )
	{
		var new_scene;
		if( typeof scene === 'object' )
		{
			new_scene = scene;
		}
		else if( typeof scene === 'function' )
		{
			var extras = Array.prototype.slice.call( arguments, 1 );
			if( extras )
				new_scene = scene.apply( null, extras );
			else
				new_scene = scene();
		}
		else
			throw new Error( "Scene object passed to Game.startScene() is neither an object nor a function" );

		// if we have a scene running, stop it first
		if( this.scene )
			this.scene.stop();
		this.scene = new_scene;
		this.scene.start();
	};

};

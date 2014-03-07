// scene.js
// Copyright 2013 Joshua C Shepard
// game scene class/module for zed-squared
//
// TODO:
// - 

zSquared.scene = function( z2 )
{
	"use strict";

	/** 
	 * @class z2#z2.Scene
	 * @classdesc Scene class. Represents a game scene/level/area
	 * @constructor
	 * @arg {Canvas} canvas The HTML5 Canvas on which to draw the scene
	 * @arg {number} width Width of the scene, in pixels
	 * @arg {number} height Height of the scene, in pixels
	 * @arg {Object} scene An object defining the functions for the scene: load,
	 * init, create, update and destroy
	 */
	z2.Scene = function( width, height, scene )
	{
		this.load = scene.load || function() {};
		this.init = scene.init || function() {};
		this.create = scene.create || function() {};
		this.update = scene.update || function() {};
		this.destroy = scene.destroy || function() {};

		// callback fcn can be set
		this.loadProgressCallback = null;

		this.width = width || 0;
		this.height = height || 0;

		this.ready = false;
	};

	/** Start the scene
	 * @method z2.Scene#start
	 * @memberof z2.Scene
	 */
	z2.Scene.prototype.start = function()
	{
		// queue the assets
		this.load();

		// start the loader
		z2.loader.load( this._start, this._loadProgressCallback, this );
	};

	/** Stop the scene
	 * @method z2.Scene#stop
	 * @memberof z2.Scene
	 */
	z2.Scene.prototype.stop = function()
	{
		// stop touch input handling
		z2.touch.stop();

		// stop kbd handling
		z2.kbd.stop();

		// clear the view (& thus Pixi)
		game.view.clear();

		// reset the ecs system
		z2.manager.reset();
	};


	/** Re-start a scene
	 * @method z2.Scene#restart
	 * @memberof z2.Scene
	 */
	z2.Scene.prototype.restart = function()
	{
		this.stop();
		this._start();
	};

	z2.Scene.prototype._start = function()
	{
		// get the ecs manager (force it to init)
		z2.manager.get();

		// init the scene
		this.init();

		// create the objects for the scene
		this.create();

		// tell the main loop that it is okay to call 'update' on us
		this.ready = true;
	};

	z2.Scene.prototype._loadProgressCallback = function( percent_done )
	{
		if( this.loadProgressCallback )
			this.loadProgressCallback( percent_done );
	};

};



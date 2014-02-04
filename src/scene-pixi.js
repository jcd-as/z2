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
	 * create and update
	 */
	z2.Scene = function( canvas, width, height, scene )
	{
		this.canvas = canvas;
		this.load = scene.load || function() {};
		this.create = scene.create || function() {};
		this.update = scene.update || function(dt) {};

		this.width = width | 0;
		this.height = height | 0;

		// create a Pixi stage for everything to be drawn on
		this.stage = new PIXI.Stage( 0x800000 );

		// get the ecs manager
		this.mgr = z2.manager.get();

		// create a view on the scene with some default values
		this.view = new z2.View( this, this.canvas.width, this.canvas.height );

		// create rendering system
		this.force_canvas = false;
		this.renderer = z2.createRenderingSystem( this.canvas, this.view, this.force_canvas );
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
		z2.loader.load( this._start, this );
	};

	z2.Scene.prototype._start = function()
	{
		// create the objects for the scene
		this.create();

		// lastly, add the renderering system
		this.mgr.addSystem( this.renderer );
	};
};



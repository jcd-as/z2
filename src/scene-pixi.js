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
	 * create and destroy
	 */
	z2.Scene = function( width, height, scene )
	{
		this.load = scene.load || function() {};
		this.create = scene.create || function() {};
		this.destroy = scene.destroy || function() {};

		this.width = width || 0;
		this.height = height || 0;
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

	/** Stop the scene
	 * @method z2.Scene#stop
	 * @memberof z2.Scene
	 */
	z2.Scene.prototype.stop = function()
	{
		this.destroy();
	};

	z2.Scene.prototype._start = function()
	{
		// get the ecs manager
		this.mgr = z2.manager.get();

		// create the objects for the scene
		this.create();
	};
};



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

		// create a Pixi stage for everything to be drawn on
		this.stage = new PIXI.Stage( 0x800000 );

		// create a view with some default values
		this.view = new z2.View( this.canvas.width, this.canvas.height );

		// add the view (camera) to the stage
		this.stage.addChild( game.view.camera_doc );
	};

};

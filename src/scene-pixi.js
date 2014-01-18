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
	 * @arg {number} width Width of the scene, in pixels
	 * @arg {number} height Height of the scene, in pixels
	 */
	z2.Scene = function( width, height )
	{
		this.width = width;
		this.height = height;

		this.stage = new PIXI.Stage( 0x800000 );
	};

};



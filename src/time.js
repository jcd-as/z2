// time.js
// Copyright 2013 Joshua C Shepard
// Time module for zed-squared
//
// TODO:
// - 

"use strict";

zSquared.time = function( z2 )
{
//	z2.require( ["math"] );

	z2.time = {};

	z2.time.now = function()
	{
		return Date.now();
	};
	
};


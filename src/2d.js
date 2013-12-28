// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - Render System
// - Transform System
// - Animated sprite System
// - Movement system
// - 

"use strict";

zSquared['2d'] = function( z2 )
{
	z2.require( ["math", "ecs"] );

	// TODO: impl

	// Component factories
	
	// 2d renderable
	// (empty 'dummy' components that just indicate they can be drawn)
	z2.renderableFactory = z2.createComponentFactory();

	// 2d image
	z2.imageFactory = z2.createComponentFactory( {img: null, width:0, height: 0} );
	// 2d position
	z2.positionFactory = z2.createComponentFactory( {x: 0, y: 0} );

	// 2d velocity
	z2.velocityFactory = z2.createComponentFactory( {x: 0, y: 0} );


	// System factories

	// RenderingSystem factory function
	z2.createRenderingSystem = function( canvas, clear )
	{
		// get a 2d context
		var context = canvas.getContext( '2d' );

		return new z2.System( [z2.renderableFactory],
		{
			init: function()
			{
				console.log( "Renderer init called" );

				// TODO: test code, remove:
				context.fillStyle = '#ffffff';
			},
			onStart: function()
			{
				console.log( "Renderer onStart called" );

				// clear screen?
				if( clear )
				{
					context.fillRect( 0, 0, canvas.width, canvas.height );
				}
			},
			update: function( e )
			{
				console.log( "Renderer update called with: " + e.id );

				// TODO: check for different kinds of renderables

				// get the image Component
				var imgc = e.getComponent( z2.imageFactory.mask );

				if( imgc )
				{
					context.drawImage( imgc.img, 0, 0, imgc.width, imgc.height, 0, 0, imgc.width, imgc.height );
				}
				// TODO: other renderables
			},
			onEnd: function()
			{
				console.log( "Renderer onEnd called" );
			},
		} );
	};

};


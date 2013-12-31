// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// . Render System
// . Transform System
// - Animated sprite System
// - Movement system (velocity component)
// - customizable rotate/scale center point
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
	z2.imageFactory = z2.createComponentFactory( {img: null} );

	// 2d position
	z2.positionFactory = z2.createComponentFactory( {x: 0, y: 0} );

	// 2d size
	z2.sizeFactory = z2.createComponentFactory( {width:0, height:0} );

	// 2d velocity
	z2.velocityFactory = z2.createComponentFactory( {x: 0, y: 0} );

	// 2d rotation
	z2.rotationFactory = z2.createComponentFactory( {theta: 0} );

	// 2d scale
	z2.scaleFactory = z2.createComponentFactory( {sx: 1, sy: 1} );

	// 2d center point
	z2.centerFactory = z2.createComponentFactory( {cx: 0.5, cy: 0.5} );

	// 2d transform
	// (empty 'dummy' components that just indicate they can be transformed)
	z2.transformFactory = z2.createComponentFactory();

	// System factories

	// RenderingSystem factory function
	// requires: renderable
	z2.createRenderingSystem = function( canvas, clear )
	{
		var context = canvas.getContext( '2d' );
		if( !context )
			throw new Error( "No 2d canvas context. Unable to continue." );

		return new z2.System( [z2.renderableFactory],
		{
			init: function()
			{
				console.log( "Renderer init called" );

				// TODO: test code, remove:
				context.fillStyle = '#ff0000';
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
				// (animated sprites, polygons, text)

				// get the image Component
				var imgc = e.getComponent( z2.imageFactory.mask );

				if( imgc )
				{
					var w = imgc.width;
					var h = imgc.height;
					// get size component, if any
					var szc = e.getComponent( z2.sizeFactory.mask );
					if( szc )
					{
						w = szc.width;
						h = szc.height;
					}
					context.drawImage( imgc.img, 0, 0, w, h, 0, 0, w, h );
				}
				// TODO: other renderables
			},
			onEnd: function()
			{
				console.log( "Renderer onEnd called" );
			},
		} );
	};

	// TransformSystem factory function
	// requires: transform, position, size
	// optional: rotation, scale, center
	z2.createTransformSystem = function( view, context )
	{
		var temp_xf = z2.matCreateIdentity();

		return new z2.System( [z2.transformFactory, z2.positionFactory, z2.sizeFactory],
		{
			init: function()
			{
				console.log( "Transform init called" );
			},
			onStart: function()
			{
				console.log( "Transform onStart called" );

				// transform to view space
			},
			update: function( e )
			{
				console.log( "Transform update called with: " + e.id );

				// get the transform component
				z2.matSetIdentity( temp_xf );

				// get the position component
				var pc = e.getComponent( z2.positionFactory.mask );
				var x = pc.x;
				var y = pc.y;

				// get the size component
				var szc = e.getComponent( z2.sizeFactory.mask );
				var w = szc.width;
				var h = szc.height;

				// get the rotation component
				var rc = e.getComponent( z2.rotationFactory.mask );
				var theta = 0;
				if( rc )
					theta = rc.theta;

				// get the scale component
				var sc = e.getComponent( z2.scaleFactory.mask );
				var sx = 1, sy = 1;
				if( sc )
				{
					sx = sc.sx;
					sy = sc.sy;
				}

				// get the center point
				var cc = e.getComponent( z2.centerFactory.mask );
				var cx = 0.5, cy = 0.5;
				if( cc )
				{
					cx = cc.cx;
					cy = cc.cy;
				}

				// set (local) transform 

				// center / pivot point
				var px = w * cx;
				var py = h * cy;

				// TODO: cache these & only re-compute when rotation changes
				var c = Math.cos( rc.theta );
				var s = Math.sin( rc.theta );
				// scale & rotation
				temp_xf[0] = c * sx;
				temp_xf[1] = -s * sy;
				temp_xf[3] = s * sx;
				temp_xf[4] = c * sy;
				// translation
				// (& account for pivot point)
				temp_xf[2] = x - (temp_xf[0] * px) - (temp_xf[1] * py);
				temp_xf[5] = y - (temp_xf[4] * py) - (temp_xf[3] * px);

				// TODO: parent transform(s)...

				// transform for view-space
				view.transform( temp_xf );

				// set the canvas context's transform
				context.setTransform( temp_xf[0], temp_xf[3], temp_xf[1], temp_xf[4], temp_xf[2], temp_xf[5] );
			},
			onEnd: function()
			{
				console.log( "Transform onEnd called" );
			},
		} );
	};
};


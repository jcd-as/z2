// z2.js
// Copyright 2013 Joshua C Shepard
// zed-squared html5 game components

var zSquared = function( opts )
{
	// create the main (namespace) object
	var z2 = 
	{
		require : function( modules )
		{
			if( !(modules instanceof Array) )
				throw new Error( "Non-array type passed to require()" );
			for( var i = 0; i < modules.length; i++ )
			{
				var m = zSquared[modules[i]] || modules[i];
				if( !(m instanceof Function) )
					throw new Error( "Non-function passed to require()" );
				m( z2 );
			}
		}
	};

	// return the main (namespace) object
	return z2;

};

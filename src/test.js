// z2 test code
//

var WIDTH = 512;
var HEIGHT = 384;

var z2 = zSquared();

// require all the z2 modules
z2.require( ["bitset", "math", "scene", "view", "ecs", "loader", "statemachine"] );

// create a scene
var scene = new z2.Scene( 1000, 1000 );
// create a view
var view = new z2.View( scene, WIDTH, HEIGHT, z2.VIEW_MODE_TIGHT, 500, 500 );

// create some test components
var pos = z2.createComponentFactory( {x: 0, y: 0} ).create( {y:1000, z:1} );
console.log( pos.mask.key );
console.log( "pos: x = " + pos.x + ", y = " + pos.y + ", z = ", pos.z );
var vf = z2.createComponentFactory( {x: 0, y: 0} );
var vel = vf.create( {y:1, x:1} );
console.log( vel.mask.key );

// create a test entity
var e = z2.manager.get().createEntity( [pos, vf] );
console.log( e.mask.key );


# z2 ("z-squared")

Z-squared is a Javascript ("HTML5") 2d game engine, based on the "Entity-Component-System" model. It provides graphics, audio and 
basic physics functionality.

A sample is included in the 'test' directory.

## Entity-Component-System
The term "Entity-Component-System" refers to an OOP architectural pattern used in video games to simplify the game logic using composition
(as opposed to inheritance). "Entities" are in-game objects (the player, 'enemies', 'bullets' etc etc). "Components" are data objects that 
encapsulate state and are attached to entities. (An entity may have any number of components). "Systems" are the behavioral components - 
they iterate over all the entities that contain certain components and operate on them. Components can be added and removed from entities 
dynamically, allowing lots of flexibility in runtime behavior and can model complex behavior without needing to create deeply nested and 
convoluted inheritance hierarchies.

See https://en.wikipedia.org/wiki/Entity_component_system for a complete description.

## Getting started

A node.js `package.json` file is included that provides scripts to build (using babel), run eslint, generate documentation and build 
the sample code / site. (I personally use `yarn` rather than `npm` so if you are an `npm` user you will have to translate these 
instructions to use it instead of `yarn`).

### Initialize the repo:
```
yarn init
```

### Generate HTML documentation 
```
yarn docs
```

### Check the code
```
yarn lint
```

### Clean the Working directories & outputs
```
yarn clean
```

### Build the code (using babel)
```
yarn build
```

### Webpack the files
```
yarn webpack
```

### Build & webpack the test code
```
yarn test
```
This will create a usable web app in the `test` directory. To use it, run a static web server from the test directory. I use python3
(`python -m http.server`).

module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadTasks('./tasks');

  grunt.initConfig({
    compile_dir: 'dist',
    src: {
      z2: [
		'src/z2.js',
		'src/math.js',
		'src/bitset.js',
		'src/statemachine.js',
		'src/scene-pixi.js',
		'src/view-pixi.js',
		'src/ecs.js',
		'src/audio.js',
		'src/loader.js',
		'src/input.js',
		'src/time.js',
		'src/2d-pixi.js',
		'src/collision.js',
		'src/tilemap.js',
		'src/tiledscene.js',
        'src/.js'
      ]
    },
    pkg: grunt.file.readJSON('package.json'),
    clean: ['<%= compile_dir %>'],
    concat: {
      z2: {
        options: {
          process: {
            data: {
              version: '<%= pkg.version %>',
              buildDate: '<%= grunt.template.today() %>'
            }
          }
        },
        src: ['<%= src.z2 %>'],
        dest: '<%= compile_dir %>/z2.js'
      }
    },
/*    umd: {
      z2: {
        src: '<%= concat.z2.dest %>',
        dest: '<%= umd.z2.src %>'
      }
    },
*/
    uglify: {
      z2: {
        options: {
          banner: '/*! z-squared v<%= pkg.version %> | (c) 2014 Joshua C Shepard */\n'
        },
        /*src: ['<%= umd.z2.dest %>'],*/
        src: ['<%= concat.z2.dest %>'],
        dest: '<%= compile_dir %>/z2.min.js'
      }
    },
    connect: {
      root: {
        options: {
          keepalive: true
        }
      }
    }
  });

  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', ['clean', 'concat', 'uglify']);

};

module.exports = function(grunt) {

  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        strict: true,
        undef: true,
        unused: true,
        bitwise: true,
        forin: true,
        freeze: true,
        latedef: true,
        noarg: true,
        nocomma: true,
        nonbsp: true,
        nonew: true,
        notypeof: true,
        jasmine: true,
        jquery: true,
        exported: {
          resizeMapArea: false
        },
        globals: {
          handleDragEvent: false,
          module: false, // for Gruntfile.js
          exports: false, // for protractor.conf.js
          inject: false, // testing angular
          angular: false,
          console: false,
          browser: false, element: false, by: false, // Protractor
        },
      },
      all: ['Gruntfile.js', 'stateService.js', 'gameService.js',
          'messageService.js', 'alphaBetaService.js', 'resizeGameAreaService.js',
          'examples/resizeMapArea.js', 'examples/drag_n_drop/dragAndDropListeners.js',
          'platform.js', 'realTimePlatform.js', 'realTimeService.js', 'realTimeSimpleService.js', 'realTimeExample.js']
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: ['stateService.js', 'gameService.js', 'messageService.js', 'alphaBetaService.js', 'resizeGameAreaService.js'],
        dest: 'dist/gameServices.js',
      },
      realTime: {
        src: ['realTimeService.js', 'messageService.js', 'resizeGameAreaService.js'],
        dest: 'dist/realTimeServices.js',
      },
      realTimeSimple: {
        src: ['realTimeSimpleService.js', 'messageService.js', 'resizeGameAreaService.js'],
        dest: 'dist/realTimeSimpleServices.js',
      },
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'angular-translate/angular-translate.2.6.1.min.js': ['angular-translate/angular-translate.2.6.1.js'],
          'dist/dragAndDropListeners.min.js': ['examples/drag_n_drop/dragAndDropListeners.js'],
          'dist/gameServices.min.js': ['dist/gameServices.js'],
          'dist/realTimeServices.min.js': ['dist/realTimeServices.js'],
          'dist/realTimeSimpleServices.min.js': ['dist/realTimeSimpleServices.js'],
          'dist/stateService.min.js': ['stateService.js'], // In my mega-game, I don't want the angular error catcher (that passes emailJavaScriptError to the parent!)
        }
      }
    },
    processhtml: {
      dist: {
        files: {
          'platform.min.html': ['platform.html']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-processhtml');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'processhtml']);

};

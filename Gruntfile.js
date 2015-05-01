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
      all: [
        'Gruntfile.js',
        'src/*.js',
        'drag_n_drop/*.js',
        'angular-translate/angular-translate.js',
        'examples/*.js',
        'emulator/turnBasedEmulator.js',
        'emulator/realTimeEmulator.js'
      ]
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: ['src/stateService.js', 'src/messageService.js', 'src/logSaver.js', 'src/gameService.js', 'src/alphaBetaService.js', 'src/resizeGameAreaService.js', 'src/angular-translate.js', 'src/dragAndDropService.js'],
        dest: 'dist/turnBasedServices.2.js',
      },
      realTime: {
        src: ['src/realTimeService.js', 'src/messageService.js', 'src/logSaver.js', 'src/randomService.js', 'src/resizeGameAreaService.js', 'src/angular-translate.js', 'src/dragAndDropService.js'],
        dest: 'dist/realTimeServices.2.js',
      },
      realTimeSimple: {
        src: ['src/realTimeSimpleService.js', 'src/messageService.js', 'src/logSaver.js', 'src/randomService.js', 'src/resizeGameAreaService.js', 'src/angular-translate.js', 'src/dragAndDropService.js'],
        dest: 'dist/realTimeSimpleServices.2.js',
      },
      app: {
        src: ['src/stateService.js', 'src/logSaver.js'],
        dest: 'dist/appServices.2.js',
      },
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'dist/turnBasedServices.2.min.js': ['dist/turnBasedServices.2.js'],
          'dist/realTimeServices.2.min.js': ['dist/realTimeServices.2.js'],
          'dist/realTimeSimpleServices.2.min.js': ['dist/realTimeSimpleServices.2.js'],
          'dist/appServices.2.min.js': ['dist/appServices.2.js'], // In my mega-game, I don't want the angular error catcher (that passes emailJavaScriptError to the parent!)
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};

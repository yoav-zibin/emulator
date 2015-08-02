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
          require: false,
          emulatorServicesCompilationDate: false,
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
        'angular-translate/languages/*.js'
      ]
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: [
          'dist/compilationDate.js',
          'ts_output_readonly_do_NOT_change_manually/src/urlParams.js',
          'ts_output_readonly_do_NOT_change_manually/src/log.js',
          'ts_output_readonly_do_NOT_change_manually/src/myStorage.js',
          'ts_output_readonly_do_NOT_change_manually/src/stateService.js',
          'ts_output_readonly_do_NOT_change_manually/src/messageService.js',
          'ts_output_readonly_do_NOT_change_manually/src/gameService.js',
          'ts_output_readonly_do_NOT_change_manually/src/resizeMapArea.js',
          'ts_output_readonly_do_NOT_change_manually/src/alphaBetaService.js',
          'ts_output_readonly_do_NOT_change_manually/src/resizeGameAreaService.js',
          'ts_output_readonly_do_NOT_change_manually/src/angular-translate.js',
          'ts_output_readonly_do_NOT_change_manually/src/dragAndDropService.js',
          'ts_output_readonly_do_NOT_change_manually/src/angularExceptionHandler.js',
        ],
        dest: 'dist/turnBasedServices.3.js',
      },
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'dist/turnBasedServices.3.min.js': ['dist/turnBasedServices.3.js'],
        }
      }
    },
    shell: {
      compilationDate: {
        command: 'echo \\"use strict\\"\\; var emulatorServicesCompilationDate = \\"`date`\\"\\; > dist/compilationDate.js'
      }
    }
  });

  require('load-grunt-tasks')(grunt);

  // Default task(s).
  grunt.registerTask('default', [
    'jshint',
    'shell:compilationDate',
    'concat',
    'uglify'
  ]);
};

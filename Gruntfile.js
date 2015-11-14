module.exports = function(grunt) {

  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      default : {
        tsconfig: true
      }
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: [
          'dist/compilationDate.js',
          'ts_output_readonly_do_NOT_change_manually/src/log.js',
          'ts_output_readonly_do_NOT_change_manually/src/stateService.js',
          'ts_output_readonly_do_NOT_change_manually/src/messageService.js',
          'ts_output_readonly_do_NOT_change_manually/src/gameService.js',
          'ts_output_readonly_do_NOT_change_manually/src/moveService.js',
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
    'shell:compilationDate',
    'concat',
    'uglify'
  ]);
};

module.exports = function(grunt) {

  'use strict';

  var clonedFiles = ["stateService", "log", "angular-translate"];
  // cmp src/stateService.ts ../multiplayer-games-web/ts/stateService.ts && ...
  var compareCommand = clonedFiles.map(function (file) { return file + ".ts"; })
    .map(function (file) { return "cmp ../emulator/src/" + file + " ../multiplayer-games-web/ts/" + file; })
    .join(" && ");
  console.log(compareCommand);

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
      compareStateService: {
        command: compareCommand,
      },
      compilationDate: {
        command: 'echo \\"use strict\\"\\; var emulatorServicesCompilationDate = \\"`date`\\"\\; > dist/compilationDate.js'
      }
    }
  });

  require('load-grunt-tasks')(grunt);

  // Default task(s).
  grunt.registerTask('default', [
    'shell:compareStateService',
    'shell:compilationDate',
    'concat',
    'uglify'
  ]);
};

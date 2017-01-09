module.exports = function(grunt) {

  'use strict';

  var clonedFiles = ["log", "angular-translate"];
  // cmp src/log.ts ../multiplayer-games-web/ts/log.ts && ...
  var compareCommand = clonedFiles.map(function (file) { return file + ".ts"; })
    .map(function (file) { return "cmp ../emulator/src/" + file + " ../multiplayer-games-web/ts/" + file; })
    .join(" && ");
  console.log(compareCommand);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      default : {
        options: {
          fast: 'never' // disable the grunt-ts fast feature
        },
        tsconfig: true
      }
    },
    concat: {
      options: {
        separator: '\n;\n',
      },
      dist: {
        src: [
          'dist/compilationDate.js',
          'ts_output_readonly_do_NOT_change_manually/src/log.js',
          'ts_output_readonly_do_NOT_change_manually/src/messageService.js',
          'ts_output_readonly_do_NOT_change_manually/src/gameService.js',
          'ts_output_readonly_do_NOT_change_manually/src/alphaBetaService.js',
          'ts_output_readonly_do_NOT_change_manually/src/resizeGameAreaService.js',
          'ts_output_readonly_do_NOT_change_manually/src/angular-translate.js',
          'ts_output_readonly_do_NOT_change_manually/src/dragAndDropService.js',
          'ts_output_readonly_do_NOT_change_manually/src/angularExceptionHandler.js',
        ],
        dest: 'dist/turnBasedServices.4.js',
      },
    },
    copy: {
      friendlygo: {
        src: 'dist/turnBasedServices.4.js',
        dest: '../friendlygo/lib/turnBasedServices.4.js',
      },
      tictactoe: {
        src: 'dist/turnBasedServices.4.js',
        dest: '../tictactoe/lib/turnBasedServices.4.js',
      },
      friendlygo: {
        src: 'dist/turnBasedServices.4.js',
        dest: '../friendlygo/lib/turnBasedServices.4.js',
      },
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
    'ts',
    'shell:compareStateService',
    'shell:compilationDate',
    'concat',
    "copy:copyTurnBasedServices",
  ]);
};

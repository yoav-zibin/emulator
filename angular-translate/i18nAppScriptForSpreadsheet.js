// Instructions:
// This is the AppScript code that processes our I18N spreadsheet.
// The I18N spreadsheet is at:
// https://docs.google.com/spreadsheets/d/1Hna21KZrIf69fIqoGISVl8-TjFJA2oBXHxDxvvnskD0/edit#gid=210545494
// If you change this AppScript, copy it back to:
// https://script.google.com/macros/d/MuctXQ0IDvYhhcnC5gCZppHGe0gmIaYGN/edit?uiv=2&mid=ACjPJvGrXpRBuxUUST61o2dsPXV9VGd8aKvCyJZTkw5sbt8AEXxRO5OyLnKr9BZD8UuwQUYeyhSVaPKCHxNDkqGlz7gFovv43Sse1o6u8O2-GifP64EwwGgqG-RfeKUYk0vIrE146f_QJX4
// The AppScript processes the active sheet, and the other Common* sheets it needs,
// and emails the game developer an email with the l10n files as attachments,
// e.g., you will get an email with 'en.js', 'he.js', etc.
// You will need to copy those files to your game languages folder.
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createAddonMenu()
      .addItem('run I18N', 'runI18N')
      .addItem('Email "Games config" to Yoav', 'emailGamesConfig')
      .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function emailGamesConfig() {
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var gamesSheet = activeSpreadSheet.getSheetByName("Games config");
  var appSheet = activeSpreadSheet.getSheetByName("App");
  var sheetNameToData = getSheetNameToData(appSheet);
  var enCodeToL10N = sheetNameToData["App"].langToCodeToL10N.en;

  var gamesData = gamesSheet.getDataRange().getValues();
  // first row is:
  // id	Is only for beta testers?	Players' colors	minOpponents	maxOpponents	Small printscreen	Game URL	game name translation ID	Game developer email (only a single email!)	Exclude from iOS	Google Play Game Services Achievement ID
  var games = [];
  var gameIdToGame = {};
  for (var r = 1; r < gamesData.length; r++) {
    var row = gamesData[r];
    if (!row || !row[0]) {
      continue;
    }
    var game = {};
    game.id = "" + row[0];
    game.isForBetaTesters = "" + row[1];
    game.playersColors = "" + row[2];
    game.minOpponents = Number(row[3]);
    game.maxOpponents = Number(row[4]);
    game.img = "" + row[5];
    game.url = "" + row[6];
    game.nameId = "" + row[7];
    game.email = "" + row[8];
    game.notInIos = "" + row[9];
    game.achievementId = "" + row[10];
    game.realTimeService = "" + row[11];
    if (row[12]) {
      throw new Error("Cell in position M" + (r+1) + " should be empty, but it was: " + row[12]);
    }
    if (!game.id || gameIdToGame[game.id]) {
      throw new Error("Missing game ID in cell A" + (r+1));
    }
    if (gameIdToGame[game.id]) {
      throw new Error("Duplicate game ID in cell A" + (r+1));
    }
    gameIdToGame[game.id] = game;
    games.push(game);
    if (game.isForBetaTesters != '' && game.isForBetaTesters != 'yes') {
      throw new Error("Beta tester can be either empty or yes in cell B" + (r+1));
    }
    if (game.realTimeService != '' && game.realTimeService != 'realTimeSimpleService' && game.realTimeService != 'realTimeService') {
      throw new Error("Real-time service can be either empty or realTimeSimpleService or realTimeService in cell L" + (r+1));
    }
    if (!game.playersColors) {
      throw new Error("Players colors can NOT be empty (it can be 'null') in cell C" + (r+1));
    }
    if (!game.minOpponents || game.minOpponents<1) {
      throw new Error("minOpponents must be at least 1 in cell D" + (r+1));
    }
    if (!game.maxOpponents || game.maxOpponents>7 || game.minOpponents > game.maxOpponents) {
      throw new Error("maxOpponents must be at most 7 and not smaller than minOpponents in cell E" + (r+1));
    }
    var playersColors = JSON.parse(game.playersColors);
    if (playersColors != null && playersColors.length != game.maxOpponents+1) {
      throw new Error("Players colors (" + game.playersColors + ") can either be null or an array of length exactly maxOpponents+1 in cell C" + (r+1));
    }
    if (playersColors != null) {
      for (var k = 0; k < playersColors.length; k++) {
        var colorId = playersColors[k];
        if (!enCodeToL10N[colorId]) {
          throw new Error("Couldn't find in 'App' sheet the translation ID '" + colorId + "' from cell C" + (r+1));
        }
      }
    }
    if (game.img && game.img.indexOf("http://") != 0) {
      throw new Error("Printscreen must start with 'http://' in cell F" + (r+1));
    }
    if (!game.url || game.url.indexOf("http://") != 0) {
      throw new Error("URL must start with 'http://' in cell G" + (r+1));
    }
    if (!game.nameId || !enCodeToL10N[game.nameId]) {
      throw new Error("Couldn't find in 'App' sheet the translation ID '" + game.nameId + "' from cell H" + (r+1));
    }
    if (!game.email || !game.email.match(/^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i)) {
      throw new Error("Illegal email in cell I" + (r+1));
    }
    if (game.notInIos != '' && game.notInIos != 'yes') {
      throw new Error("Exclude from iOS can be either empty or yes in cell J" + (r+1));
    }
    if (game.achievementId != '' && game.achievementId.length != 'CgkIoeuux6EJEAIQAg'.length) {
      throw new Error("Google Play Game Services Achievement ID can be either empty or of certain length in cell K" + (r+1));
    }
  }

  var lines = [];
  lines.push("angular.module('myApp').service('gamesConfig', function () {")
  lines.push("  'use strict';");
  lines.push("  this.gamesConfig = [");
  for (var k = 0; k < games.length; k++) {
    var game = games[k];
    lines.push("    {");
    lines.push("      id: " + game.id + ",");
    lines.push("      isForBetaTesters: " + (game.isForBetaTesters ? true : false) + ",");
    lines.push("      playersColors: " + game.playersColors + ",");
    lines.push("      minOpponents: " + game.minOpponents + ",");
    lines.push("      maxOpponents: " + game.maxOpponents + ",");
    lines.push("      img: " + JSON.stringify(game.img) + ",");
    lines.push("      url: " + JSON.stringify(game.url) + ",");
    lines.push("      nameId: " + JSON.stringify(game.nameId) + ",");
    lines.push("      email: " + JSON.stringify(game.email) + ",");
    lines.push("      achievementId: " + JSON.stringify(game.achievementId) + ",");
    lines.push("      notInIos: " + (game.notInIos ? true : false) + ",");
    lines.push("      realTimeService: " + JSON.stringify(game.realTimeService));
    lines.push("    }" + (k == games.length-1 ? "" : ","));
  }
  lines.push("  ];");
  lines.push("});");

  var output = lines.join("\n") + "\n";
  MailApp.sendEmail("yoav.zibin@gmail.com", "Games config", "Save this in js/gamesConfig.js", {
     name: 'Automatic Emailer Script',
     attachments: [Utilities.newBlob(output, 'text/js', "gamesConfig.js")]
  });
  //sendEmail(appSheet, sheetNameToData);
}

function getSheetNameToData(activeSheet) {
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheetData = readSheetData(activeSheet);
  var sheetNameToData = {};
  var sheetName = activeSheet.getName();
  if (sheetName.indexOf("Common") == 0) {
    throw new Error("Your active sheet name starts with 'Common' (" + sheetName + "). You should only run I18N on non-Common* sheets!");
  }
  sheetNameToData[sheetName] = activeSheetData;
  // Check needsSheets is legal: all names exist (we previously checked that they start with 'Common', and that 'Common' sheets don't need other sheets).
  var needsSheets = activeSheetData.needsSheets;
  for (var j = 0; j < needsSheets.length; j++) {
    var needSheetName = needsSheets[j];
    var needSheet = activeSpreadSheet.getSheetByName(needSheetName);
    if (!needSheet) {
      throw new Error("Sheet '" + sheetName + "' entered in Cell A1 that it needs sheet '" + needSheetName + "', but that sheet doesn't exist!");
    }
    sheetNameToData[needSheetName] = readSheetData(needSheet);
  }

  var emailQuotaRemaining = MailApp.getRemainingDailyQuota();
  if (emailQuotaRemaining < 10) {
    throw new Error("No more daily quota for sending emails, please try again tomorrow :)");
  }

  // Merge with the needed sheets
  var sheetData = activeSheetData;
  var needsSheets = sheetData.needsSheets;
  var langToCodeToL10N = sheetData.langToCodeToL10N;
  var langToCodeAndL10N = sheetData.langToCodeAndL10N;
  var email = sheetData.email;
  // fetch data of other sheets that are needed.
  for (var i = 0; i < needsSheets.length; i++) {
    var needSheetName = needsSheets[i];
    var otherSheetData = sheetNameToData[needSheetName];
    var otherSheetLangToCodeAndL10N = otherSheetData.langToCodeAndL10N;
    for (var lang in langToCodeToL10N) {
      if (!otherSheetLangToCodeAndL10N[lang]) {
        throw new Error("Language '" + lang + "' exist in sheet " + sheetName + " but is missing from sheet " + needSheetName + ". Either add it to " + needSheetName + ", or remove it from " + sheetName);
      }
      var codeAndL10N = otherSheetLangToCodeAndL10N[lang];
      for (var k = 0; k < codeAndL10N.length; k++) {
        var code = codeAndL10N[k].code;
        if (langToCodeToL10N[lang][code]) {
          throw new Error("Code=" + code + " appeared twice: once in sheet " + sheetName + " and once in sheet " + needSheetName);
        }
        langToCodeToL10N[lang][code] = codeAndL10N[k].l10n;
        langToCodeAndL10N[lang].push(codeAndL10N[k]);
      }
    }
  }

  return sheetNameToData;
}

function runI18N() {
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = activeSpreadSheet.getActiveSheet();
  var sheetNameToData = getSheetNameToData(activeSheet);
  sendEmail(activeSheet, sheetNameToData);
}

// Returns {needsSheets, langToCodeAndL10N, langToCodeToL10N, email}
function readSheetData(sheet) {
  var sheetName = sheet.getName();
  var isCommon = sheetName.indexOf("Common") == 0;
  var codeInRow = isCommon ? 0 : 2;
  var values = sheet.getDataRange().getValues();
  if (!values) {
    throw new Error("Sheet " + sheetName + " is empty!");
  }
  // First row for results
  // Second row must be: Code	en	he ...
  if (!values[codeInRow] || values[codeInRow][0] != 'Code') {
    throw new Error("Cell A" + (codeInRow+1) + " in sheet " + sheetName + " must be 'Code'");
  }
  var needsSheets = [];
  var email = '';
  if (!isCommon) {
    if (!values[0] || values[0][0] != 'NeedsSheets:') {
      throw new Error("Cell A1 in sheet " + sheetName + " must be 'NeedsSheets:'");
    }
    if (!values[1] || values[1][0] != 'Game developer email:') {
      throw new Error("Cell A2 in sheet " + sheetName + " must be 'Game developer email:'");
    }
    for (var c = 1; c < values[0].length; c++) {
      var otherSheetName = values[0][c];
      if (!otherSheetName) {
        continue;
      }
      if (otherSheetName.indexOf("Common") != 0) {
        throw new Error("Cell A" + (c+1) + " in sheet " + sheetName + " must contain only a Common* sheet, e.g., 'CommonRealTimeColors', but it was '" + otherSheetName + "'");
      }
      needsSheets.push(otherSheetName);
    }
    email = values[1][1];
    if (!email || email.indexOf("@") <= 0) {
      throw new Error("Cell B2 in sheet " + sheetName + " must contain a valid email address, but it was '" + email + "'");
    }
  }
  var langToCodeToL10N = {};
  var langToCodeAndL10N = {};
  for (var c = 1; c < values[1].length; c++) {
    var lang = values[codeInRow][c];
    if (!lang || lang == '') {
      continue;
    }
    var data = {};
    var codeAndL10N = [];
    for (var r = codeInRow + 1; r < values.length; r++) {
      var code = values[r][0];
      var l10n = values[r][c];
      if (!code || code == '') {
        continue;
      }
      if (!l10n || l10n == '') {
        throw new Error("Missing l10n for code=" + code + " in lang=" + lang + " in sheet " + sheetName);
      }
      if (data[code]) {
        throw new Error("Code=" + code + " appeared twice in sheet " + sheetName + " with translations: " + l10n + " and " + data[code]);
      }
      data[code] = l10n;
      codeAndL10N.push({code: code, l10n: l10n});
    }
    langToCodeAndL10N[lang] = codeAndL10N;
    langToCodeToL10N[lang] = data;
  }
  if (!langToCodeAndL10N['en']) {
    throw new Error("You have to have an 'en' translation!");
  }
  // Check all l10n had the exact same placeholders, e.g., "Downloaded {{x}} out of {{y}} games" has "x" and "y" placeholders.
  for (var r = 0; r < langToCodeAndL10N['en'].length; r++) {
    var enCodeAndL10N = langToCodeAndL10N['en'][r];
    var code = enCodeAndL10N.code;
    var enL10N = enCodeAndL10N.l10n;
    var enPlaceholders = JSON.stringify(getPlaceholders(enL10N));
    for (var lang in langToCodeAndL10N) {
      var codeAndL10N = langToCodeAndL10N[lang][r];
      if (codeAndL10N.code != code) {
        throw new Error("Internal error! email yoav.zibin@gmail.com");
      }
      var l10n = codeAndL10N.l10n;
      var placeholders = JSON.stringify(getPlaceholders(l10n));
      if (placeholders != enPlaceholders) {
        throw new Error("The placeholders for code=" + code + " is not the same in two l10n! English placeholders are '" + enPlaceholders + "' vs '" + placeholders + "'. The two l10n are: en=" + enL10N + " " + lang + "=" + l10n);
      }
    }
  }
  return {langToCodeAndL10N: langToCodeAndL10N, langToCodeToL10N: langToCodeToL10N, needsSheets: needsSheets, email: email};
}

// E.g., "Downloaded {{x}} out of {{y}} games" returns ["x","y"] (sorted).
function getPlaceholders(txt) {
  var placeholders = [];
  if (!txt.match(/^[^{}]*([^{}]*\{\{[\w]+\}\}[^{}]*)*[^{}]*$/i)) {
    throw new Error("Number of '{{' and '}}' is not balanced in l10n='" + txt + "'");
  }
  var myRegexp = /\{\{([\w]+)\}\}/g;
  match = myRegexp.exec(txt);
  while (match != null) {
    // matched text: match[0]
    // match start: match.index
    // capturing group n: match[n]
    placeholders.push(match[1]);
    match = myRegexp.exec(txt);
  }
  placeholders.sort();
  return placeholders;
}

function sendEmail(sheet, sheetNameToData) {
  var sheetName = sheet.getName();
  var sheetData = sheetNameToData[sheetName];
  var langToCodeAndL10N = sheetData.langToCodeAndL10N;
  var email = sheetData.email;

  var outputSheet = [[],[]];
  var blobs = [];
  for (var lang in langToCodeAndL10N) {
    var lines = [];
    lines.push("window.angularTranslationsLoaded('" + lang + "',{");
    var codeAndL10N = langToCodeAndL10N[lang];
    for (var k = 0; k < codeAndL10N.length; k++) {
      var code = codeAndL10N[k].code;
      var l10n = codeAndL10N[k].l10n;
      lines.push(JSON.stringify(code) + ":" + JSON.stringify(l10n) + (k == codeAndL10N.length - 1 ? "" : ","));
    }
    lines.push("});");
    var output = lines.join("\n") + "\n";
    var fileName = lang + '.js';
    outputSheet[0].push(fileName);
    outputSheet[1].push(output);
    var blob = Utilities.newBlob(output, 'text/js', fileName);
    blobs.push(blob);
  }

  var subject = 'I18N files for game ' + sheetName;
  var body = "Save these files in your game's languages folder";
  MailApp.sendEmail(email, subject, body, {
     name: 'Automatic Emailer Script',
     attachments: blobs
  });

  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("OutputOfL10N")
      .getRange(1, 1, 2, outputSheet[1].length).setValues(outputSheet);
}


/*
function initGamesConfig() {

  var playersOneTwo = ["PLAYER_ONE","PLAYER_TWO"];
  var playersX_O = ["PLAYER_X","PLAYER_O"];
  var whiteBlack = ["WHITE", "BLACK"];
  var whiteRed = ["WHITE", "RED"];
  var blackWhite = ["BLACK", "WHITE"];
  var redBlue = ["RED", "BLUE"];
  var redGreen = ["RED", "GREEN"];
  var redBlack = ["RED", "BLACK"];
  var greenPurple = ["GREEN", "PURPLE"];
  var blokusColors = ["BLUE", "YELLOW", "RED", "GREEN"];
  var realTimeColors = ['BLUE', 'RED', 'BROWN', 'PURPLE', 'PINK', 'YELLOW', 'ORANGE', 'SILVER'];

  var halatafl = ["SHEEP", "WOLVES"];
  // Games not working in iOS: Reversi (scale), Yatzy&Gomoku&RevolvingDoor&ConnectFour (not showing),
  // ChineseCheckers: dragging is too hard (in iOS and Android).
  var games = [
// Fall 2014
{id: 41, players: blackWhite, notInIos: true, ach:"CgkIoeuux6EJEAIQAg", img: "imgs/Reversi.jpg", name: "REVERSI_GAME", url: "http://purnima01.github.io/Reversi/game.html"},
{id: 42, players: playersOneTwo, ach:"CgkIoeuux6EJEAIQAw", img: "imgs/Yatzy.jpg", name: "YATZY_GAME", url: "http://yoav-zibin.github.io/yatzy/game.html", email: "yoav.zibin@gmail.com"},
{id: 43, players: blackWhite, ach:"CgkIoeuux6EJEAIQCA", img: "imgs/Go.jpg", name: "GO_GAME", url: "http://valsharea.github.io/smpgWEIQI/game.html"},
{id: 44, players: blackWhite, notInIos: true, ach:"CgkIoeuux6EJEAIQBw", img: "imgs/Gomoku.jpg", name: "GOMOKU_CONNECT5_GAME", url: "http://punk0706.github.io/SMGGomoku/game.html"},
{id: 45, players: redBlue, beta: true, ach:"CgkIoeuux6EJEAIQCg", img: "imgs/ChineseCheckers.jpg", name: "CHINESE_CHECKERS_GAME", url: "http://bbccyy.github.io/chineseChecker/scale.html"},
{id: 46, players: whiteBlack, ach:"CgkIoeuux6EJEAIQCQ", img: "imgs/GameOfAmazons.jpg", name: "GAME_OF_AMAZONS_GAME", url: "http://prakhar05.github.io/GameOfAmazons/scale.html"},
{id: 47, players: redBlue, ach:"CgkIoeuux6EJEAIQBg", img: "imgs/Janggi.jpg", name: "JANGGI_GAME", url: "http://sh2514.github.io/Janggi/game.html"},
{id: 48, players: whiteBlack, ach:"CgkIoeuux6EJEAIQBA", img: "imgs/Kamisado.jpg", name: "KAMISADO_GAME", url: "http://rshen1993.github.io/KMSD/scale.html"},
{id: 49, players: whiteRed, ach:"CgkIoeuux6EJEAIQBQ", img: "imgs/LinesOfAction.jpg", name: "LINES_OF_ACTION_GAME", url: "http://xuxiaoyu89.github.io/LinesOfActions/scale.html"},
{id: 50, players: playersX_O, ach:"CgkIoeuux6EJEAIQCw", img: "imgs/TicTacToe.jpg", name: "TICTACTOE_GAME", url: "http://yoav-zibin.github.io/TicTacToe/game.min.html", email: "yoav.zibin@gmail.com"},
{id: 51, players: greenPurple, notInIos: true, ach:"CgkIoeuux6EJEAIQDA", img: "imgs/RevolvingDoor.jpg", name: "REVOLVING_DOOR_GAME", url: "http://angiebird.github.io/RevolvingDoor/game.html"},
{id: 52, players: redBlue, notInIos: true, ach:"CgkIoeuux6EJEAIQDQ", img: "imgs/ConnectFour.jpg", name: "CONNECT_FOUR_GAME", url: "http://ashwinnyu.github.io/Connect4/game.html"},
{id: 53, players: blackWhite, ach:"CgkIoeuux6EJEAIQDw", img: "http://chongzizil.github.io/Checkers-SMG/imgs/checkers-small.png", name: "CHECKERS_GAME", url: "http://chongzizil.github.io/Checkers-SMG/app/index.html", email: "chongzizil@gmail.com"},
{id: 54, players: null, notInIos: true, ach:"CgkIoeuux6EJEAIQDg", img: "http://chongzizil.github.io/Cheat-SMG/imgs/cheat-small.png", name: "CHEAT_GAME", url: "http://chongzizil.github.io/Cheat-SMG/app/index.html", email: "chongzizil@gmail.com"},
// Spring 2015
{id: 55, players: blokusColors, minOpponents: 3, maxOpponents: 3, img: "http://duffywan.github.io/Blokus/imgs/lessThan20KB.jpg", name: "BLOKUS_GAME", url: "http://duffywan.github.io/Blokus/game.min.html", email: "yw1840@nyu.edu"},
{id: 56, players: whiteBlack, img: "http://orzzzl.github.io/NineMen-sMorris/imgs/lessThan20KB.jpg", name: "NINE_MENS_MORRIS_GAME", url: "http://orzzzl.github.io/NineMen-sMorris/game.min.html", email: "zhuangzeleng19920731@gmail.com"},
{id: 57, players: null , img: "http://dependingonmood.github.io/Banqi/imgs/lessThan20KB.jpg", name: "BANQI_GAME", url: "http://dependingonmood.github.io/Banqi/game.min.html", email: "xiaodongbo627@gmail.com"},
{id: 58, players: redGreen, img: "http://ZhuoranLyu.github.io/Risk/imgs/lessThan20KB.jpg", name: "RISK_GAME", url: "http://ZhuoranLyu.github.io/Risk/game.min.html", email: "zl953@nyu.edu"},
{id: 59, players: redGreen, img: "http://hui-yang.github.io/SMG-Barricade/imgs/lessThan20KB.jpg", name: "BARRICADE_GAME", url: "http://hui-yang.github.io/SMG-Barricade/game.min.html", email: "vera.hui.yang@gmail.com"},
{id: 60, players: blackWhite, img: "http://ryanray13.github.io/Connect6/imgs/lessThan20KB.jpg", name: "CONNECT6_GAME", url: "http://ryanray13.github.io/Connect6/app/game.min.html", email: "wuping.lei@nyu.edu"},
{id: 61, players: whiteBlack, img: "http://cz764.github.io/Chess/imgs/lessThan20KB.jpg", name: "CHESS_GAME", url: "http://cz764.github.io/Chess/game.min.html", email: "chenzhu@nyu.edu"},
{id: 62, players: halatafl, img: "http://colinzang.github.io/Halatafl/imgs/lessThan20KB.jpg", name: "HALATAFL_GAME", url: "http://colinzang.github.io/Halatafl/game.min.html", email: "zangwz@gmail.com"},
//minOpponents: 1, maxOpponents: 3,
{id: 63, players: null, img: "http://jz1371.github.io/PROJECT_Rummikub/imgs/lessThan20KB.jpg", name: "RUMMIKUB_GAME", url: "http://jz1371.github.io/PROJECT_Rummikub/app/game.min.html", email: "jz1371@nyu.edu"},
{beta: true, id: 64, players: null, img: "http://ibtawfik.github.io/Backgammon/imgs/lessThan20KB.jpg", name: "BACKGAMMON_GAME", url: "http://ibtawfik.github.io/Backgammon/game.min.html", email: "ibtawfik@gmail.com"},
{id: 65, players: redBlue, img: "http://npb245.github.io/HexGame/imgs/lessThan20KB.jpg", name: "HEX_GAME", url: "http://npb245.github.io/HexGame/game.min.html", email: "npb245@nyu.edu"},
{id: 66, players: redBlack, img: "http://sonali-malik.github.io/Havannah/imgs/lessThan20KB.jpg", name: "HAVANNAH_GAME", url: "http://sonali-malik.github.io/Havannah/game.min.html", email: "sm5119@nyu.edu"},
{id: 67, players: redBlack, img: "http://nuterian.github.io/Biloba/imgs/lessThan20KB.jpg", name: "BILOBA_GAME", url: "http://nuterian.github.io/Biloba/game.min.html", email: "jugalm9@gmail.com"},
{id: 68, players: null, img: "http://rasikajangle.github.io/Oware/imgs/lessThan20KB.jpg", name: "MANCALA_OWARE_GAME", url: "http://rasikajangle.github.io/Oware/game.min.html", email: "rsjangle27@gmail.com"},
// Real-time games
{realTime: true, beta: true, id: 69, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://yoav-zibin.github.io/snake/imgs/lessThan20KB.jpg", name: "SNAKE_GAME", url: "http://yoav-zibin.github.io/snake/index.min.html", email: "yoav.zibin@gmail.com"},
{realTime: true, beta: true, id: 70, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://phfwc.org/wp-content/uploads/2015/01/example.jpg", name: "REAL_TIME_EXAMPLE_GAME", url: "http://yoav-zibin.github.io/emulator/realTimeExample.html", email: "yoav.zibin@gmail.com"},
{realTime: true, beta: true, id: 71, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://duffywan.github.io/Pac-Man/imgs/lessThan20KB.jpg", name: "PACMAN_GAME", url: "http://duffywan.github.io/Pac-Man/", email: "zhuangzeleng19920731@gmail.com"},
{realTime: true, beta: true, id: 72, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://dependingonmood.github.io/Pappu-Pakia/imgs/lessThan20KB.jpg", name: "PAPPU_PAKIA_GAME", url: "http://dependingonmood.github.io/Pappu-Pakia/game.min.html", email: "xiaodongbo627@gmail.com"},
{realTime: true, beta: true, id: 73, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://zhuoranlyu.github.io/Raiden/imgs/lessThan20KB.jpg", name: "RAIDEN_GAME", url: "http://zhuoranlyu.github.io/Raiden/index.html", email: "zl953@nyu.edu"},
{realTime: true, beta: true, id: 74, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://hui-yang.github.io/WordSearch/imgs/lessThan20KB.jpg", name: "WORD_SEARCH_GAME", url: "http://hui-yang.github.io/WordSearch/index.min.html", email: "vera.hui.yang@gmail.com"},
{realTime: true, beta: true, id: 75, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://ryanray13.github.io/Tetris/imgs/lessThan20KB.jpg", name: "TETRIS_GAME", url: "http://ryanray13.github.io/Tetris/app/index.min.html", email: "wuping.lei@nyu.edu"},
{realTime: true, beta: true, id: 76, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://pizza-pan.github.io/PingPong/imgs/lessThan20KB.jpg", name: "PING_PONG_GAME", url: "http://pizza-pan.github.io/PingPong/index.html", email: "patrickpanzz17@gmail.com"},
{realTime: true, beta: true, id: 77, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://jz1371.github.io/PROJECT_Tank/imgs/lessThan20KB.jpg", name: "TANK_GAME", url: "http://jz1371.github.io/PROJECT_Tank/index.min.html", email: "jz1371@nyu.edu"},
{realTime: true, beta: true, id: 78, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://ibtawfik.github.io/snakeIslam/imgs/lessThan20KB.jpg", name: "SNAKE2_GAME", url: "http://ibtawfik.github.io/snakeIslam/", email: "ibtawfik@gmail.com"},
{realTime: true, beta: true, id: 79, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://sonali-malik.github.io/RealTimeFlappyBird/imgs/lessThan20KB.jpg", name: "FLAPPY_BIRD_GAME", url: "http://sonali-malik.github.io/RealTimeFlappyBird/index.html", email: "npb245@nyu.edu"},
{realTime: true, beta: true, id: 80, players: realTimeColors, minOpponents: 1, maxOpponents: 7, img: "http://jugalm.com/asteroids/imgs/lessThan20KB.jpg", name: "ASTEROIDS_GAME", url: "http://jugalm.com/asteroids/game.html", email: "jugalm9@gmail.com"}
  ];
  //id	Is only for beta testers?	Players' colors	minOpponents	maxOpponents	Small printscreen	Game URL	game name translation ID	Game developer email (only a single email!)
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = activeSpreadSheet.getSheetByName("Games config");
  var output = [];
  for (var r = 0; r < games.length; r++) {
    var g = games[r];
    output.push([g.id, g.beta ? "yes" : "", JSON.stringify(g.players),
                 g.minOpponents ? g.minOpponents : 1,
                 g.maxOpponents ? g.maxOpponents : 1,
                 g.img, g.url, g.name,
                 g.email ? g.email : "",
                 g.notInIos ? "yes" : "", g.ach ? g.ach : ""]);
  }
  sheet.getRange(2, 1, output.length, output[0].length).setValues(output);
}*/

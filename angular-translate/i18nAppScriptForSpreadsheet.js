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
      .addToUi();
}

function onInstall(e) {
  onOpen(e);
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

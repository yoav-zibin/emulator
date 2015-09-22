interface ISet {
  key: string;
  value: any;
  visibleToPlayerIndexes?: number[];
}
interface ISetVisibility {
  key: string;
  visibleToPlayerIndexes?: number[];
}
interface ISetRandomInteger {
  key: string;
  from: number;
  to: number;
}
interface IDelete {
  key: string;
}
interface IShuffle {
  keys: string[];
}
interface ISetTurn {
  turnIndex: number;
}
interface IEndMatch {
  endMatchScores: number[];
}
interface IOperation {
  set?: ISet;
  setVisibility?: ISetVisibility;
  setRandomInteger?: ISetRandomInteger;
  delete?: IDelete;
  shuffle?: IShuffle;
  setTurn?: ISetTurn;
  endMatch?: IEndMatch;
}
type IMove = IOperation[];
interface IState {
  [index: string]: any;
}
interface IIsMoveOk {
  move: IMove;
  turnIndexBeforeMove : number;
  turnIndexAfterMove: number;
  stateBeforeMove: IState;
  stateAfterMove: IState;
  numberOfPlayers: number;
}
type PlayMode = string | number;
interface IUpdateUI extends IIsMoveOk {
  playersInfo: IPlayerInfo[];
  yourPlayerIndex: number;
  playMode: PlayMode;
  moveNumber: number;
  randomSeed: string;
  endMatchScores?: number[];
}
interface IGameMethods {
  isMoveOk(move: IIsMoveOk): boolean;
  updateUI(update: IUpdateUI): void;
}
interface Math {
  seedrandom(seed: string): void;
  originalRandom(): number;
}
/*interface IStateService {
  setGame(game: IGameMethods): void;
  makeMove(move: IMove): void;
}*/

interface IVisibility {
  [index: string]: number[];
}
interface IMatchState {
  turnIndexBeforeMove: number;
  turnIndex: number;
  endMatchScores?: number[];
  moveNumber: number;
  randomSeed: string;
  lastMove: IMove;
  lastState: IState;
  currentState: IState;
  lastVisibleTo: IVisibility;
  currentVisibleTo: IVisibility;
}

module stateService {
  let game: IGameMethods;
  let currentState: IState;
  let lastState: IState;
  let currentVisibleTo: IVisibility;
  let lastVisibleTo: IVisibility;
  let lastMove: IMove;
  let turnIndexBeforeMove: number;
  let turnIndex: number = 0; // turn after the move (-1 when the game ends)
  let endMatchScores: number[] = null;
  let setTurnOrEndMatchCount: number = 0;
  let playersInfo: IPlayerInfo[];
  let playMode: PlayMode = "passAndPlay"; // Default play mode

  let randomSeed: string;
  let moveNumber: number;

  let simulateServerDelayMilliseconds:number = 100;

  export function setSimulateServerDelayMilliseconds(_simulateServerDelayMilliseconds: number): void {
    simulateServerDelayMilliseconds = _simulateServerDelayMilliseconds;
  }
  export function setPlayMode(_playMode: PlayMode): void {
    playMode = _playMode;
  }
  export function setRandomSeed(_randomSeed: string): void {
    randomSeed = _randomSeed;
  }

  export function setPlayers(_playersInfo: IPlayerInfo[]): void {
    playersInfo = _playersInfo;
  }

  export function initNewMatch(): void {
    if (!game) {
      throwError("You must call setGame before any other method.");
    }
    currentState = {};
    lastState = null;
    currentVisibleTo = {};
    lastVisibleTo = null;
    lastMove = [];
    turnIndexBeforeMove = 0;
    turnIndex = 0; // can be -1 in the last updateUI after the game ended.
    endMatchScores = null;
    moveNumber = 0;
  }

  //Function to get the keys from a JSON object
  function getKeys(object: any): string[] {
    if (Object && Object.keys) {
      return Object.keys(object);
    }
    let keys: string[] = [];
    for (let key in object) {
      keys.push(key);
    }
    return keys;
  }

  function clone<T>(obj: T): T {
    return angular.copy(obj);
  }

  function isNull(obj: any): boolean {
    return obj === undefined || obj === null;
  }

  function throwError(...args: any[]): void {
    log.error("Throwing an error with these arguments=", args);
    let msg = args.join(", ");
    throw new Error(msg);
  }

  function getMoveForPlayerIndex(playerIndex: number, move: IMove): IMove {
    let moveForPlayer: IMove = [];
    for (let k = 0; k < move.length; k++) {
      let operation: IOperation = move[k];
      if (!isNull(operation.set) &&
          !isNull(operation.set.visibleToPlayerIndexes) &&
          operation.set.visibleToPlayerIndexes.indexOf(playerIndex) === -1) {
        moveForPlayer.push({
          set: {
            key : operation.set.key,
            value : null,
            visibleToPlayerIndexes : operation.set.visibleToPlayerIndexes
          }
        });
      } else {
        moveForPlayer.push(operation);
      }
    }
    return moveForPlayer;
  }

  function getStateForPlayerIndex(playerIndex: number, gameState: IState, visibleTo: IVisibility): IState {
    if (gameState === null) {
      return null;
    }
    let result: IState = {};
    let keys: string[] = getKeys(gameState);
    for (let k = 0; k < keys.length; k++) {
      let visibleToPlayerIndexes = visibleTo[keys[k]];
      let value: any = null;
      if (isNull(visibleToPlayerIndexes) || visibleToPlayerIndexes.indexOf(playerIndex) > -1) {
        value = gameState[keys[k]];
      }
      result[keys[k]] = value;
    }
    return result;
  }

  function shuffle(keys: string[]): string[] {
    let keysCopy: string[] = keys.slice(0);
    let result: string[] = [];
    while (keysCopy.length >= 1) {
      let index = randomFromTo(0, keysCopy.length);
      let removed = keysCopy.splice(index, 1)[0];
      result.push(removed);
    }
    return result;
  }

  export function randomFromTo(from: number, to: number): number {
    if (isNull(from) || isNull(to) || from >= to) {
      throw new Error("In randomFromTo(from,to), you must have from<to, but from=" + from + " to=" + to);
    }
    return Math.floor(Math.random() * (to - from) + from);
  }

  function processApiOperation(operation: IOperation): void {
    //Check for all types of Operations
    let key: string;
    let visibleToPlayerIndexes: number[];
    if (!isNull(operation.set)) {
      let opSet = operation.set;
      key = opSet.key;
      visibleToPlayerIndexes = opSet.visibleToPlayerIndexes;
      let value: any = opSet.value;
      if (isNull(key) || isNull(value)) {
        throwError("Fields key and value in Set operation must be non null. operation=" + angular.toJson(operation, true));
      }
      currentState[key] = value;
      if (visibleToPlayerIndexes) {
        currentVisibleTo[key] = visibleToPlayerIndexes;
      } else {
        delete currentVisibleTo[key];
      }
    } else if (!isNull(operation.setTurn)) {
      let setTurn = operation.setTurn;
      turnIndex = setTurn.turnIndex;
      setTurnOrEndMatchCount++;
    } else if (!isNull(operation.setRandomInteger)) {
      let setRandomInteger = operation.setRandomInteger;
      key = setRandomInteger.key;
      let from: number = setRandomInteger.from;
      let to: number = setRandomInteger.to;
      if (isNull(key) || isNull(from) || isNull(to)) {
        throwError("Fields key, from, and to, in SetRandomInteger operation must be non null. operation=" + angular.toJson(operation, true));
      }
      let randomValue: number = randomFromTo(from, to);
      currentState[key] = randomValue;
      delete currentVisibleTo[key];
    } else if (!isNull(operation.setVisibility)) {
      let setVisibility = operation.setVisibility;
      key = setVisibility.key;
      visibleToPlayerIndexes = setVisibility.visibleToPlayerIndexes;
      if (isNull(key)) {
        throwError("Fields key in SetVisibility operation must be non null. operation=" + angular.toJson(operation, true));
      }
      if (visibleToPlayerIndexes) {
        currentVisibleTo[key] = visibleToPlayerIndexes;
      } else {
        delete currentVisibleTo[key];
      }
    } else if (!isNull(operation['delete'])) {
      let opDelete = operation['delete'];
      key = opDelete.key;
      if (isNull(key)) {
        throwError("Field key in Delete operation must be non null. operation=" + angular.toJson(operation, true));
      }
      delete currentState[key];
      delete currentVisibleTo[key];
    } else if (!isNull(operation.shuffle)) {
      let opShuffle = operation.shuffle;
      let keys: string[] = opShuffle.keys;
      if (isNull(keys) || keys.length === 0) {
        throwError("Field keys in Shuffle operation must be a non empty array. operation=" + angular.toJson(operation, true));
      }
      let shuffledKeys: string[] = shuffle(keys);
      let oldGameState: IState = clone(currentState);
      let oldVisibleTo: IVisibility = clone(currentVisibleTo);
      for (let j = 0; j < shuffledKeys.length; j++) {
        let fromKey: string = keys[j];
        let toKey: string = shuffledKeys[j];
        currentState[toKey] = oldGameState[fromKey];
        currentVisibleTo[toKey] = oldVisibleTo[fromKey];
      }
    } else if (!isNull(operation.endMatch)) {
      let endMatch = operation.endMatch;
      setTurnOrEndMatchCount++;
      let scores: number[] = endMatch.endMatchScores;
      if (isNull(scores) || scores.length !== playersInfo.length) {
        throwError("Field scores in EndMatch operation must be an array of the same length as the number of players. operation=" + angular.toJson(operation, true));
      }
      endMatchScores = scores;
      if (playMode === "onlyAIs") {
        $timeout(() => { initNewMatch(); }, 1000); // start a new match in 1 second.
      }
    } else {
      throwError("Illegal operation, it must contain either set, setRandomInteger, setVisibility, delete, shuffle, or endMatch: " + angular.toJson(operation, true));
    }
  }

  function getYourPlayerIndex(): number {
    return playMode === "playWhite" ? 0 :
          playMode === "playBlack" ? 1 :
          playMode === "playViewer" ? -2 : // viewer is -2 (because -1 for turnIndexAfterMove means the game ended)
          playMode === "playAgainstTheComputer" || playMode === "onlyAIs" ||
              playMode === "passAndPlay" ? turnIndex :
          Number(playMode);
  }

  export function getMatchState(): IMatchState {
    return {
      turnIndexBeforeMove: turnIndexBeforeMove,
      turnIndex: turnIndex,
      endMatchScores: endMatchScores,
      moveNumber: moveNumber,
      randomSeed: randomSeed,
      lastMove: lastMove,
      lastState: lastState,
      currentState: currentState,
      lastVisibleTo: lastVisibleTo,
      currentVisibleTo: currentVisibleTo
    };
  }

  export function setMatchState(data: IMatchState): void {
    turnIndexBeforeMove = data.turnIndexBeforeMove;
    turnIndex = data.turnIndex;
    endMatchScores = data.endMatchScores;
    moveNumber = data.moveNumber ? data.moveNumber : 0;
    randomSeed = data.randomSeed;
    lastMove = data.lastMove;
    lastState = data.lastState;
    currentState = data.currentState;
    lastVisibleTo = data.lastVisibleTo;
    currentVisibleTo = data.currentVisibleTo;
  }

  function delayedSendUpdateUi(): void {
    let moveForIndex = getMoveForPlayerIndex(turnIndex, lastMove);
    let stateBeforeMove = getStateForPlayerIndex(turnIndex, lastState, lastVisibleTo);
    let stateAfterMove = getStateForPlayerIndex(turnIndex, currentState, currentVisibleTo);
    if (lastMove.length > 0 && game.isMoveOk(
      {
        move : moveForIndex,
        turnIndexBeforeMove : turnIndexBeforeMove,
        turnIndexAfterMove : turnIndex,
        stateBeforeMove : stateBeforeMove,
        stateAfterMove : stateAfterMove,
        numberOfPlayers: playersInfo.length
      }) !== true) {
      throwError("You declared a hacker for a legal move! move=" + moveForIndex);
    }

    game.updateUI(
      {
        move : moveForIndex,
        turnIndexBeforeMove : turnIndexBeforeMove,
        turnIndexAfterMove : turnIndex,
        stateBeforeMove : stateBeforeMove,
        stateAfterMove : stateAfterMove,
        numberOfPlayers: playersInfo.length,
        playersInfo : playersInfo,
        yourPlayerIndex : getYourPlayerIndex(),
        playMode: playMode,
        moveNumber: moveNumber,
        randomSeed: randomSeed,
        endMatchScores: endMatchScores
      });
  }

  export function sendUpdateUi(): void {
    if (simulateServerDelayMilliseconds === 0) {
      delayedSendUpdateUi();
    } else {
      $timeout(() => { delayedSendUpdateUi(); }, simulateServerDelayMilliseconds);
    }
  }

  export function makeMove(operations: IMove): void {
    if (!game) {
      throwError("You must call setGame before any other method.");
    }
    // Making sure only turnIndex can make the move
    if (turnIndex === -1) {
      throwError("You cannot send a move after the game ended!");
    }
    if (getYourPlayerIndex() !== turnIndex) {
      throwError("Expected a move from turnIndex=" + turnIndex + " but got the move from index=" + getYourPlayerIndex());
    }

    lastState = clone(currentState);
    lastVisibleTo = clone(currentVisibleTo);
    turnIndexBeforeMove = turnIndex;
    turnIndex = -1;
    lastMove = operations;
    moveNumber++;
    if (randomSeed && Math.seedrandom) {
      Math.seedrandom(randomSeed + moveNumber); // Math.random is used only in processApiOperation
    }
    setTurnOrEndMatchCount = 0;
    for (let i = 0; i < operations.length; i++) {
      processApiOperation(operations[i]);
    }
    // We must have either SetTurn or EndMatch
    if (setTurnOrEndMatchCount !== 1) {
      throwError("We must have either SetTurn or EndMatch, but not both: setTurnOrEndMatchCount=" + setTurnOrEndMatchCount);
    }
    if (!(turnIndex >= -1 && turnIndex < playersInfo.length)) {
      throwError("turnIndex must be between -1 and " + playersInfo.length + ", but it was " + turnIndex + ".");
    }
    sendUpdateUi();
  }

  export function setGame(_game: IGameMethods): void {
    if (game !== undefined) {
      throwError("You can call setGame only once");
    }
    game = _game;
  }

  export function getEndMatchScores(): number[] {
    return endMatchScores;
  }
}

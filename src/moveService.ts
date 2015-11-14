interface NewMove {
  endMatchScores?: number[];
  turnIndexAfterMove?: number;
  stateAfterMove: any;
}
interface IStateTransition {
  turnIndexBeforeMove : number;
  stateBeforeMove: any;
  numberOfPlayers: number;
  move: NewMove;
}
interface NewUpdateUI extends IStateTransition {
  playersInfo: IPlayerInfo[];
  yourPlayerIndex: number;
  playMode: PlayMode;
}
interface NewGame {
  minNumberOfPlayers: number;
  maxNumberOfPlayers: number;
  checkMoveOk(stateTransition: IStateTransition): void;
  updateUI(update: NewUpdateUI): void;
}
module moveService {
  let STATE_KEY = "state";
  function convertOldState(state: any): any {
    //return state ? state[STATE_KEY] : null;
    
    if (!state) return null;
    // TODO: delete (code for TicTacToe backward compatibility)
    if (state[STATE_KEY] === undefined) {
      return {delta: state.delta, board: state.board};
    }
    return state[STATE_KEY];
  }
  function convertIsMoveOk(params: IIsMoveOk): IStateTransition {
    return {
      turnIndexBeforeMove: params.turnIndexBeforeMove,
      numberOfPlayers: params.numberOfPlayers,
      stateBeforeMove: convertOldState(params.stateBeforeMove),
      move: convertOldMove(params.move)
    };
  }

  function convertUpdate(params: IUpdateUI): NewUpdateUI {
    return {
      playersInfo: params.playersInfo,
      yourPlayerIndex: params.yourPlayerIndex,
      playMode: params.playMode,
      turnIndexBeforeMove: params.turnIndexBeforeMove,
      numberOfPlayers: params.numberOfPlayers,
      stateBeforeMove: convertOldState(params.stateBeforeMove),
      move: convertOldMove(params.move)
    };
  }

  function convertOldMove(move: IMove): NewMove {
    if (!move || move.length === 0) {
      return {
        endMatchScores: null,
        turnIndexAfterMove: 0,
        stateAfterMove: null,
      };
    }
    // TODO: delete (code for TicTacToe backward compatibility)
    if (move.length === 3) {
      move = [move[0], {set: {key: "state", value: {board: move[1].set.value, delta: move[2].set.value}}}];
    }
    if (move.length !== 2 || !(move[0].setTurn || move[0].endMatch) || !move[1].set) {
      throw new Error("Internal error: old move should be an array with 2 operations! old move=" +
          angular.toJson(move, true));
    }
    return {
      endMatchScores: move[0].endMatch ? move[0].endMatch.endMatchScores : null,
      turnIndexAfterMove: move[0].setTurn ? move[0].setTurn.turnIndex : -1,
      stateAfterMove: move[1].set.value,
    };
  }

  function convertNewMove(move: NewMove): IMove {
    // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
    let isOver = move.turnIndexAfterMove === -1;
    if (isOver !== (move.endMatchScores !== null)) {
      // Match ongoing
      throw new Error("Illegal move: turnIndexAfterMove can be -1 iff endMatchScores is not null. Move=" +
          angular.toJson(move, true));
    }
    return [
      isOver ? {endMatch: {endMatchScores: move.endMatchScores}} : {setTurn: {turnIndex: move.turnIndexAfterMove}},
      {set: {key: STATE_KEY, value: move.stateAfterMove}}
    ];
  }

  export function setGame(game: NewGame): void {
    let oldGame:IGame = {
      minNumberOfPlayers: game.minNumberOfPlayers,
      maxNumberOfPlayers: game.maxNumberOfPlayers,
      isMoveOk: function (params: IIsMoveOk): boolean {
        let move = convertIsMoveOk(params);
        log.info("Calling game.checkMoveOk:", move);
        game.checkMoveOk(move);
        return true;
      },
      updateUI: function (params: IUpdateUI): void {
        let newParams = convertUpdate(params);
        log.info("Calling game.updateUI:", newParams);
        game.updateUI(newParams);
      },
    };
    gameService.setGame(oldGame);
  }

  export function makeMove(move: NewMove): void {
    log.info("Making move:", move);
    gameService.makeMove(convertNewMove(move));
  }
}

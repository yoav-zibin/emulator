namespace gamingPlatform {

interface NewUpdateUI extends ICommonUI {
  playersInfo: IPlayerInfo[];
  playMode: PlayMode;
}

interface NewGame {
  minNumberOfPlayers: number;
  maxNumberOfPlayers: number;
  checkMoveOk(stateTransition: IStateTransition): void;
  updateUI(update: NewUpdateUI): void;
  communityUI(communityUI: ICommunityUI): void;
  gotMessageFromPlatform(message: any): void;
  getStateForOgImage(): string;
}
export module moveService {
  let STATE_KEY = "state";
  function convertOldState(state: any): any {
    return state ? state[STATE_KEY] : null;
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
      // Not using convertOldMove, because one of the players might have
      // dismissed the match, so turnIndexAfterMove might be -1 (even though the move sets to another player index)
      move: {
        endMatchScores: params.endMatchScores,
        turnIndexAfterMove: params.turnIndexAfterMove,
        stateAfterMove: convertOldState(params.stateAfterMove),
      },
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

  export function checkMove(move: NewMove): void {
    // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
    let noTurnIndexAfterMove = move.turnIndexAfterMove === -1;
    let hasEndMatchScores = !!move.endMatchScores;
    if (noTurnIndexAfterMove && !hasEndMatchScores) {
      throw new Error("Illegal move: turnIndexAfterMove was -1 but you forgot to set endMatchScores. Move=" +
          angular.toJson(move, true));
    }
    if (hasEndMatchScores && !noTurnIndexAfterMove) {
      throw new Error("Illegal move: you set endMatchScores but you didn't set turnIndexAfterMove to -1. Move=" +
          angular.toJson(move, true));
    }
  }
  function convertNewMove(move: NewMove): IMove {
    checkMove(move);
    return [
      move.endMatchScores ? {endMatch: {endMatchScores: move.endMatchScores}} : {setTurn: {turnIndex: move.turnIndexAfterMove}},
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
      communityUI: game.communityUI,
      gotMessageFromPlatform: game.gotMessageFromPlatform,
      getStateForOgImage: game.getStateForOgImage,
    };
    gameService.setGame(oldGame);
  }

  export function makeMove(move: NewMove): void {
    log.info("Making move:", move);
    gameService.makeMove(convertNewMove(move));
  }

  export function communityMove(proposal: IProposal, move: NewMove): void {
    log.info("Making communityMove: proposal=", proposal, " move=", move);
    gameService.communityMove(proposal, move);
  }
}

}

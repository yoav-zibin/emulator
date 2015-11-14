var moveService;
(function (moveService) {
    var STATE_KEY = "state";
    function convertIsMoveOk(params) {
        return {
            turnIndexBeforeMove: params.turnIndexBeforeMove,
            numberOfPlayers: params.numberOfPlayers,
            stateBeforeMove: params.stateBeforeMove ? params.stateBeforeMove[STATE_KEY] : null,
            move: convertOldMove(params.move)
        };
    }
    function convertUpdate(params) {
        return {
            playersInfo: params.playersInfo,
            yourPlayerIndex: params.yourPlayerIndex,
            playMode: params.playMode,
            turnIndexBeforeMove: params.turnIndexBeforeMove,
            numberOfPlayers: params.numberOfPlayers,
            stateBeforeMove: params.stateBeforeMove ? params.stateBeforeMove[STATE_KEY] : null,
            move: convertOldMove(params.move)
        };
    }
    function convertOldMove(move) {
        if (!move || move.length === 0) {
            return {
                endMatchScores: null,
                turnIndexAfterMove: 0,
                stateAfterMove: null,
            };
        }
        // TODO: delete (code for TicTacToe backward compatibility)
        if (move.length === 3) {
            move = [move[0], { set: { key: "state", value: { board: move[1].set.value, delta: move[2].set.value } } }];
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
    function convertNewMove(move) {
        // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
        var isOver = move.turnIndexAfterMove === -1;
        if (isOver !== (move.endMatchScores !== null)) {
            // Match ongoing
            throw new Error("Illegal move: turnIndexAfterMove can be -1 iff endMatchScores is not null. Move=" +
                angular.toJson(move, true));
        }
        return [
            isOver ? { endMatch: { endMatchScores: move.endMatchScores } } : { setTurn: { turnIndex: move.turnIndexAfterMove } },
            { set: { key: STATE_KEY, value: move.stateAfterMove } }
        ];
    }
    function setGame(game) {
        var oldGame = {
            minNumberOfPlayers: game.minNumberOfPlayers,
            maxNumberOfPlayers: game.maxNumberOfPlayers,
            isMoveOk: function (params) {
                var move = convertIsMoveOk(params);
                log.info("Calling game.checkMoveOk:", move);
                game.checkMoveOk(move);
                return true;
            },
            updateUI: function (params) {
                var newParams = convertUpdate(params);
                log.info("Calling game.updateUI:", newParams);
                game.updateUI(newParams);
            },
        };
        gameService.setGame(oldGame);
    }
    moveService.setGame = setGame;
    function makeMove(move) {
        log.info("Making move:", move);
        gameService.makeMove(convertNewMove(move));
    }
    moveService.makeMove = makeMove;
})(moveService || (moveService = {}));

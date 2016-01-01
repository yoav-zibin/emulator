var gamingPlatform;
(function (gamingPlatform) {
    var moveService;
    (function (moveService) {
        var STATE_KEY = "state";
        function convertOldState(state) {
            return state ? state[STATE_KEY] : null;
        }
        function convertIsMoveOk(params) {
            return {
                turnIndexBeforeMove: params.turnIndexBeforeMove,
                numberOfPlayers: params.numberOfPlayers,
                stateBeforeMove: convertOldState(params.stateBeforeMove),
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
                stateBeforeMove: convertOldState(params.stateBeforeMove),
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
                    gamingPlatform.log.info("Calling game.checkMoveOk:", move);
                    game.checkMoveOk(move);
                    return true;
                },
                updateUI: function (params) {
                    var newParams = convertUpdate(params);
                    gamingPlatform.log.info("Calling game.updateUI:", newParams);
                    game.updateUI(newParams);
                },
            };
            gamingPlatform.gameService.setGame(oldGame);
        }
        moveService.setGame = setGame;
        function makeMove(move) {
            gamingPlatform.log.info("Making move:", move);
            gamingPlatform.gameService.makeMove(convertNewMove(move));
        }
        moveService.makeMove = makeMove;
    })(moveService = gamingPlatform.moveService || (gamingPlatform.moveService = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=moveService.js.map
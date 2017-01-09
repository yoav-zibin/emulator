namespace gamingPlatform {

interface IAlphaBetaLimits {
  millisecondsLimit? : number;
  maxDepth? : number;
}

export module alphaBetaService {
  /**
   * Does alpha-beta search, starting from startingState,
   * where the first move is done by playerIndex (playerIndex is either 0 or 1),
   * then the next move is done by 1-playerIndex, etc.
   *
   * getNextStates(state, playerIndex) should return an array of the following states
   * and if state is a terminal state it should return an empty array.
   *
   * getStateScoreForIndex0(state, playerIndex) should return a score for
   * the state as viewed by player index 0, i.e.,
   * if player index 0 is probably winning then the score should be high.
   * Return Number.POSITIVE_INFINITY is player index 0 is definitely winning,
   * and Number.NEGATIVE_INFINITY if player index 0 is definitely losing.
   *
   * getDebugStateToString can either be null (and then there is no output to console)
   * or it can be a function, where getDebugStateToString(state) should return
   * a string representation of the state (which is used in calls to console.log).
   *
   * alphaBetaLimits is an object that sets a limit on the alpha-beta search,
   * and it has either a millisecondsLimit or maxDepth field:
   * millisecondsLimit is a time limit, and maxDepth is a depth limit.
   */
  export function alphaBetaDecision(
      startingState: IMove,
      playerIndex: number,
      getNextStates: (move: IMove, playerIndex: number) => IMove[],
      getStateScoreForIndex0: (move: IMove, playerIndex: number) => number,
      // If you want to see debugging output in the console, then surf to game.html?debug
      getDebugStateToString: (move: IMove) => string,
      alphaBetaLimits: IAlphaBetaLimits): IMove {
    let move = alphaBetaDecisionMayReturnNull(
        startingState,
        playerIndex,
        getNextStates,
        getStateScoreForIndex0,
        getDebugStateToString,
        alphaBetaLimits);
    if (move) {
      return move;
    }
    // We run out of time, but we have to return a non-null move (no matter what).
    return getNextStates(startingState, playerIndex)[0];
  }

  function alphaBetaDecisionMayReturnNull(
      startingState: IMove,
      playerIndex: number,
      getNextStates: (move: IMove, playerIndex: number) => IMove[],
      getStateScoreForIndex0: (move: IMove, playerIndex: number) => number,
      // If you want to see debugging output in the console, then surf to game.html?debug
      getDebugStateToString: (move: IMove) => string,
      alphaBetaLimits: IAlphaBetaLimits): IMove {
    // Checking input
    if (!startingState || !getNextStates || !getStateScoreForIndex0) {
      throw new Error("startingState or getNextStates or getStateScoreForIndex0 is null/undefined");
    }
    if (playerIndex !== 0 && playerIndex !== 1) {
      throw new Error("playerIndex must be either 0 or 1");
    }
    if (!alphaBetaLimits.millisecondsLimit && !alphaBetaLimits.maxDepth) {
      throw new Error("alphaBetaLimits must have either millisecondsLimit or maxDepth");
    }
    
    if (alphaBetaLimits.millisecondsLimit) {
      // 400 milliseconds is the max time (otherwise the app feels unresponsive).
      alphaBetaLimits.millisecondsLimit = Math.min(400, alphaBetaLimits.millisecondsLimit);
    }

    let startTime = new Date().getTime(); // used for the time limit
    if (alphaBetaLimits.maxDepth) {
      return getScoreForIndex0(
          startingState, playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString, alphaBetaLimits,
          startTime, 0,
          Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY).bestState;
    }
    // For time limits (without maxDepth), we do iterative deepening (A* search).
    if (getDebugStateToString != null) {
      console.log("Doing iterative-deepeninh (A*) until we run out of time or find a certain win/lose move.");
    }
    let maxDepth = 1;
    let bestState: IMove;
    while (true) {
      if (getDebugStateToString != null) {
        console.log("Alpha-beta search until maxDepth=" + maxDepth);
      }
      let nextBestStateAndScore = getScoreForIndex0(
          startingState, playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString,
          {maxDepth: maxDepth, millisecondsLimit: alphaBetaLimits.millisecondsLimit},
          startTime, 0,
          Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
      let nextBestScore = nextBestStateAndScore.bestScore;
      let nextBestState = nextBestStateAndScore.bestState;
      if (nextBestScore === Number.POSITIVE_INFINITY ||
          nextBestScore === Number.NEGATIVE_INFINITY) {
        let isWin = nextBestScore ===
            (playerIndex === 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        console.log("Discovered that AI is going to " +
            (isWin ? "win" : "lose") + " with maxDepth=" + maxDepth);
        if (getDebugStateToString != null) {
            console.log("Best state is " + getDebugStateToString(nextBestState));
        }
        return nextBestState;
      }
      let isHalfTimePassed =
          isTimeout({millisecondsLimit: alphaBetaLimits.millisecondsLimit / 2}, startTime);
      let isAllTimePassed = isTimeout(alphaBetaLimits, startTime);
      if (isHalfTimePassed || isAllTimePassed) {
        // If we run out of half the time, then no point of starting a new search that
        // will most likely take more time than all previous searches.
        // It's more accurate to return the best state for the previous alpha-beta search
        // if we run out of time, because we finished traversing all
        // immediate children of the starting state.
        let result = !isAllTimePassed || maxDepth === 1 ? nextBestState : bestState;
        if (isAllTimePassed) {
          console.log("Run out of time when maxDepth=" + maxDepth +
              ", so returning the best state for maxDepth=" +
              (maxDepth === 1 ? 1 : maxDepth - 1));
        } else {
          console.log("Run out of half the time when maxDepth=" + maxDepth +
              ", so no point of exploring the next depth.");
        }
        if (getDebugStateToString != null) {
            console.log("Best state is " + getDebugStateToString(result));
        }
        return result;
      }
      bestState = nextBestState;
      maxDepth++;
    }
  }

  function isTimeout(alphaBetaLimits: IAlphaBetaLimits, startTime: number): boolean {
    return alphaBetaLimits.millisecondsLimit &&
        new Date().getTime() - startTime > alphaBetaLimits.millisecondsLimit;
  }

  interface ScoreState {
    bestScore: number;
    bestState: IMove;
  }

  function getScoreForIndex0(
        startingState: IMove,
        playerIndex: number,
        getNextStates: (move: IMove, playerIndex: number) => IMove[],
        getStateScoreForIndex0: (move: IMove, playerIndex: number) => number,
        // If you want to see debugging output in the console, then surf to game.html?debug
        getDebugStateToString: (move: IMove) => string,
        alphaBetaLimits: IAlphaBetaLimits,
        startTime: number, depth: number, alpha: number, beta: number): ScoreState {
    let bestScore: number = null;
    let bestState: IMove = null;
    if (isTimeout(alphaBetaLimits, startTime)) {
      if (getDebugStateToString != null) {
        console.log("Run out of time, just quitting from this traversal.");
      }
      return {bestScore: 0, bestState: null}; // This traversal is "ruined" anyway because we ran out of time.
    }
    if (depth === alphaBetaLimits.maxDepth) {
      bestScore = getStateScoreForIndex0(startingState, playerIndex);
      if (getDebugStateToString != null) {
        console.log("Max depth reached, score is " + bestScore);
      }
      return {bestScore: bestScore, bestState: null};
    }
    let states = getNextStates(startingState, playerIndex);
    if (getDebugStateToString != null) {
      console.log(getDebugStateToString(startingState) + " has " + states.length + " next states");
    }
    if (states.length === 0) {
      bestScore = getStateScoreForIndex0(startingState, playerIndex);
      if (getDebugStateToString != null) {
        console.log("Terminal state, score is " + bestScore);
      }
      return {bestScore: bestScore, bestState: null};
    }
    for (let i = 0; i < states.length; i++) {
      let state = states[i];
      let scoreForIndex0 = getScoreForIndex0(
          state, 1 - playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString, alphaBetaLimits,
          startTime, depth + 1, alpha, beta).bestScore;

      if (getDebugStateToString != null) {
        console.log("Score of " + getDebugStateToString(state) + " is " + scoreForIndex0);
      }
      if (bestScore === null ||
          playerIndex === 0 && scoreForIndex0 > bestScore ||
          playerIndex === 1 && scoreForIndex0 < bestScore) {
        bestScore = scoreForIndex0;
        bestState = state;
      }
      if (playerIndex === 0) {
        if (bestScore >= beta) {
          return {bestScore: bestScore, bestState: bestState};
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (bestScore <= alpha) {
          return {bestScore: bestScore, bestState: bestState};
        }
        beta = Math.min(beta, bestScore);
      }
    }
    if (getDebugStateToString != null) {
      console.log("Best next state for playerIndex " + playerIndex + " is " + getDebugStateToString(bestState) + " with score of " + bestScore);
    }
    return {bestScore: bestScore, bestState: bestState};
  }
}

let typeCheck_alphaBetaService: IAlphaBetaService = alphaBetaService;

}

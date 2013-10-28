/*jslint vars: true, passfail: false */
/*global WorldProto, TetrominoProto */
require('./WorldProto');
require('./TetrominoProto');

var ServerEngineProto = function(initParams){
    /**
     * Defines and executes the game logic, determining and triggering the 
     * proper actions to take based on the current game state (scenario).
     * 
     * Action: process/pass a message from/to an entity or the World.
     * 
     * Actions can be triggered by the engine's AI itself, any entity's AI, or 
     * user (keyDown/Up) events.
     * 
     * Actions are registered and stored in actionsBuffer[], and processed 
     * as fast as possible by function process().
     * 
     */

    'use strict';

    var tThis = this;
    initParams = initParams||{};
    this.geinitParams = function (){return initParams;};
    var replay = initParams.replay||false;
    var wasReplay = initParams.wasReplay||false;
    this.isReplay = function(){return replay;}; 
    var tetrominosRecord = initParams.tetrominosRecord||[];
    var actionBuffersRecord = initParams.actionBuffersRecord||[];
    var processIntervalsRecord = initParams.processIntervalsRecord||[];
    var tempTetrominosRecord = initParams.tempTetrominosRecord||[];
    var tempActionBuffersRecord = initParams.tempActionBuffersRecord||[];
    var tempProcessIntervalsRecord = initParams.tempProcessIntervalsRecord||[];
    var replaySpeed = initParams.replaySpeed||1;
    var replayTimeoutId;
    var lastProcessTimeStamp = initParams.lastProcessTimeStamp||null;
    var tWorld = initParams.tWorld||null; 
    this.getWorld = function(){ return tWorld; };
    var actionsBuffer = initParams.actionsBuffer||[];
    var tTromino = initParams.tTromino||null; 
    var lines = initParams.lines||null; 
    var points = initParams.points||null; 
    var startLevel = initParams.startLevel||null; 
    var level = initParams.level||null; 
    var setLinesDisplayText = initParams.setLinesDisplayText||function(text){
        //TODO: $('#lines').text(text);
    };
    var setScoreDisplayText = initParams.setScoreDisplayText||function(text){
        //TODO: $('#score').text(text);
    };
    var getHighScore = initParams.$getHighScore||function(){ 
        return localStorage.getItem('tetrominos-highscore'); 
    };
    var setHighScore = initParams.$setHighScore||function(){ 
        return localStorage.setItem('tetrominos-highscore', points);
    };
    var setLevelDisplayText = initParams.setLevelDisplayText||function(text){
        //TODO: $('#level').text(text);
    };
    this.getLevel = function(){return level;};
    var onPause = initParams.onPause||null;
    this.getOnPause = function(){ return onPause; };
    var onHelp = initParams.onHelp||null;
    this.getOnHelp = function(){ return onHelp; };
    var gOver = initParams.gOver||null; 
    var defaultStartLevel = initParams.defaultStartLevel||0;
    var keyDownInterval = initParams.keyDownInterval||200;
    var keyDownIntervalIds = initParams.keyDownIntervalIds||{
            rotateLeft : undefined,
            rotateRight : undefined,
            moveLeft : undefined,
            moveRight : undefined,
            next : undefined,
            pause : undefined
        };
    var actions = initParams.actions||{
        rotateLeft : 65,
        rotateRight : 68,
        moveLeft : 37,
        moveRight : 39,
        moveDown : 40,
        drop : 32,
        pause : 80,
        help : 72
    };
    var bindActions = initParams.bindActions||function(action, func){
        //TODO: bind on message received (return $(window).bind(action, func);)
    };
    var unbindActions = initParams.unbindActions||function(action){
        //TODO: unbind on message received (return $(window).unbind(action);)
    };
    this.increaseReplaySpeed = function(pow2ToXFactor){
        if (!pow2ToXFactor) {pow2ToXFactor=1;}
        replaySpeed = Math.min(replaySpeed*Math.pow(2,pow2ToXFactor),32);
    };
    this.decreaseReplaySpeed = function(pow2ToMinusXFactor){
        if (!pow2ToMinusXFactor) {pow2ToMinusXFactor=1;}
        replaySpeed = Math.max(
            replaySpeed*Math.pow(2,-pow2ToMinusXFactor),
            0.0625
        );
    };
    var move = function() {
        tWorld.updateGridPos('clear',tTromino.getCurrentCoordinates());
        tTromino.updatePosition();
        tWorld.updateGridPos(
            TetrominoProto.colors(tTromino.getType()),
            tTromino.getCurrentCoordinates()
        );
    };
    var isAvailable = function(pos){
        for (var j in pos.x){
            if ((!tWorld.isClear(pos.x[j],pos.y[j]) &&
                !tTromino.isCurrent(pos.x[j],pos.y[j])) ||//(!free && !myself)
                (pos.y[j]>=tWorld.getGridParams().height) ||//|| overflow(down)
                (pos.x[j]>=tWorld.getGridParams().width) ||//|| overflow(right)
                (pos.x[j]<0)){                             //|| overflow(left)
                return false;
            }
        }
        return true;
    };
    this.getSkyLinePeak = function(){
        var topLine = {x:[],y:[]}; 
        for (var i=0;i<tWorld.getGridParams().width;i++){
            topLine.x.push(i);
            topLine.y.push(0);
        }
        return getBorder(topLine).distance;
    };
    var getBorder = function(testPos){
        /*
         * Returns min free distance between tetromino and filled
         * cells (end of grid if none) downwards.
         */
        var pos = testPos;
        pos.distance=-1;
        while (isAvailable(pos)){
            for (var i in pos.x){
                pos.y[i]++;
            }
            pos.distance++;
        }
        if (pos.distance !== -1) {
            for (var i in pos.x){
                pos.y[i]--;
            }
        }
        return pos;
    };
    var resolve = function() {
        /*
         * 1) If lines to chop:
         *      -chop lines (full rows),
         *      -increase lines,(level),points
         *      -test end of game (canvas overflow)
         * 
         * 2) If not EOG: call new tetromino
         * 
         * 3) Test end of game (grid override)
         * 
         * 
         */

        var fullRows = tWorld.getFullRows();
        tWorld.updateGridRows(fullRows);
        
        lines+=fullRows.length;
        points+=fullRows.length*fullRows.length*(level+1)*100;
        level = startLevel + Math.floor(lines/10);

        tWorld.writeMessage('lvl: '+level+' l: '+lines+' s: '+points);
        setLevelDisplayText(level);
        setLinesDisplayText(lines);
        setScoreDisplayText(points);
        
        var coords = tTromino.getCurrentCoordinates();
        for ( var i = 0;i<coords.y.length;i++) {
            if (coords.y[i]<0){
                gameOver();
                break;
            }
        }
        if (!gOver){
            var tInitParams;
            tTromino.stop();
            actionsBuffer = [];
            if (!replay){
                tInitParams = {
                    x:Math.floor(tWorld.getGridParams().width / 2) - 1, 
                    y:-1,
                    t:TetrominoProto.types(Math.floor(Math.random() * 7)),
                    r:0
                };
                tetrominosRecord.push(tInitParams);
            } else {
                tInitParams = tetrominosRecord.shift();
                tempTetrominosRecord.push(tInitParams);
            }
            tTromino = new TetrominoProto(
                tThis,
                tInitParams.x,
                tInitParams.y,
                tInitParams.t,
                tInitParams.r
            );
            coords = tTromino.getCurrentCoordinates();
            for ( var i = 0;i<coords.y.length;i++) {
                if (coords.y[i]>=0&&!tWorld.isClear(coords.x[i],coords.y[i])){
                    gameOver();
                    break;
                }
            }
            if (!gOver&&!replay){
                tTromino.go();
            }
        }
    };
    var process = function() {
        var action;
        if (actionsBuffer===undefined){
            return;
        }
        if (!replay) { 
            actionBuffersRecord.push(actionsBuffer.slice(0));
            var now = new Date().getTime();
            var processInterval = now - lastProcessTimeStamp;
            lastProcessTimeStamp = now;
            processIntervalsRecord.push(processInterval);
        }
        while ((action = actionsBuffer.shift())!==undefined){
            var t = tTromino.getType();
            var l = TetrominoProto.rotations(t).length;
            var v = tTromino.vector;
            var p = tTromino.getPosition();
            p.x+=v[0];
            p.y+=v[1];
            var r = tTromino.getRotation(v[2]);
            switch (action) {
                case 'moveDown' :
                    if (
                        getBorder(
                            TetrominoProto.getCoordinates(
                                t,
                                {x:p.x,y:p.y+1},
                                r
                            )
                        ).distance>=0
                    ) {
                        tTromino.vector[1]+=1;
                    } else {
                        resolve();
                    }
                    break;
                case 'moveLeft' :
                    if (
                        getBorder(
                            TetrominoProto.getCoordinates(
                                t,
                                {x:p.x-1,y:p.y},
                                r
                            )
                        ).distance>=0
                    ) {
                        tTromino.vector[0]-=1;
                    }
                    break;
                case 'moveRight':
                    if (
                        getBorder(
                            TetrominoProto.getCoordinates(
                                t,
                                {x:p.x+1,y:p.y},
                                r
                            )
                        ).distance>=0
                    ) {
                        tTromino.vector[0]+=1;
                    }
                    break;
                case 'rotateLeft':
                    if (
                        getBorder(
                            TetrominoProto.getCoordinates(t,p,(r+l-1)%l)
                        ).distance>=0
                    ) {
                        tTromino.vector[2]-=1;
                    }
                    break;
                case 'rotateRight':
                    if (
                        getBorder(
                            TetrominoProto.getCoordinates(t,p,(r+1)%l)
                        ).distance>=0
                    ) {
                        tTromino.vector[2]+=1;
                    }
                    break;
                case 'drop':
                    tTromino.vector[1]+=(
                        getBorder(
                            TetrominoProto.getCoordinates(t,{x:p.x,y:p.y},r)
                        ).distance
                    );
                    move();
                    resolve();
                    break;
                case 'pause':
                    tThis.pauseDialog.open();
                    return;
                case 'help':
                    tThis.helpDialog.open();
                    return;
                default :
                    console.log(
                        "No handler found for action `" + action + "`."
                    );
                    return;
            }
        }
        move();
        tWorld.redrawDirtyCells();
        if (replay&&!onPause&&!onHelp) {processActionsRecord();}
    };
    this.pushAction = function(action){
        if (replay||onHelp||onPause||gOver) {return;}
        if (actionsBuffer.length===0){
            actionsBuffer.push(action);
            process();
        } else {
            actionsBuffer.push(action);
        }
    };
    var processActionsRecord = function(){
        actionsBuffer = actionBuffersRecord.shift();
        if (actionsBuffer){
            tempActionBuffersRecord.push(actionsBuffer.slice(0));
            var processInterval = processIntervalsRecord.shift();
            tempProcessIntervalsRecord.push(processInterval);
            replayTimeoutId = setTimeout(
                process, 
                processInterval/Math.min(Math.max(replaySpeed,0.0625),32)
            );
       } 
    };
    var keyDown = function(event) {

        var command = Object.keys(actions).filter(function(key) {
            return actions[key] === event.which;
        });
        if (!replay){
            if (command[0] !== undefined) {
                var interval = keyDownInterval;
                if (command[0] === 'moveLeft' || command[0] === 'moveRight'){
                    interval = Math.min(
                        keyDownInterval, 
                        Math.max(
                            Math.ceil(
                                1000/(
                                    1000/tTromino.fallInterval
                                  + 500*tThis.getLevel()/tTromino.fallInterval
                                )
                            ),
                            100
                        )
                    );
                }
                if (keyDownIntervalIds[command[0]] === undefined) {
                    tThis.pushAction(command[0]);
                    keyDownIntervalIds[command[0]] = setInterval(
                        function() {
                            tThis.pushAction(command[0]);
                        }, 
                        interval
                    );
                }
            }
        } else {
            if (command[0] === 'pause') {
                tThis.pauseDialog.open();
            } else {
                if (event.which === 107||event.which===187){
                    tThis.increaseReplaySpeed();
                } else if (event.which === 109||event.which===189){
                    tThis.decreaseReplaySpeed();
                } else if (command[0]==='help'){
                    tThis.helpDialog.open();
                }
            }
        }
    };
    var keyUp = function(event) {
        var command = Object.keys(actions).filter(function(key) {
            return actions[key] === event.which;
        });
        clearInterval(keyDownIntervalIds[command[0]]);
        keyDownIntervalIds[command[0]] = undefined;
    };
    this.start = function(){
        var sIParams = initParams.startInitParams||{};
        onPause = sIParams.onPause||false;
        onHelp = sIParams.onHelp||false;
        gOver = sIParams.gOver||false;
        actionsBuffer = sIParams.actionsBuffer||[];
        tempTetrominosRecord = sIParams.tempTetrominosRecord||[];
        tempActionBuffersRecord = sIParams.tempActionBuffersRecord||[];
        tempProcessIntervalsRecord = sIParams.tempProcessIntervalsRecord||[];
        var tInitParams;
        if (!replay){
            tetrominosRecord = sIParams.tetrominosRecord||[];
            actionBuffersRecord = sIParams.actionBuffersRecord||[];
            processIntervalsRecord = sIParams.processIntervalsRecord||[];
            tInitParams = sIParams.tTrominoInitParams||{
                x:Math.floor(tWorld.getGridParams().width / 2) - 1, 
                y:-1,
                t:TetrominoProto.types(Math.floor(Math.random() * 7)),
                r:0
            };
            tetrominosRecord.push(tInitParams);
        } else {
            replaySpeed = 1;
            tInitParams = tetrominosRecord.shift();
            tempTetrominosRecord.push(tInitParams);
        }
        tTromino = new TetrominoProto(
            tThis,
            tInitParams.x,
            tInitParams.y,
            tInitParams.t,
            tInitParams.r
        );
        lines = sIParams.lines||0;
        points = sIParams.points||0;
        startLevel = sIParams.startLevel||defaultStartLevel;
        level = sIParams.level||startLevel;
        tWorld.writeMessage('lvl: '+level+' l: '+lines+' s: '+points);
        setLevelDisplayText(level);
        setLinesDisplayText(lines);
        setScoreDisplayText(points);
        tThis.go();
    };
    this.go = function() {
        unbindActions('keydown');
        bindActions('keydown', keyDown);
        bindActions('keyup', keyUp);
        lastProcessTimeStamp = new Date().getTime();
        process();
        if (replay) { processActionsRecord(); } else {tTromino.go();}
    };
    var stop = function() {
        tTromino.stop();
        unbindActions('keydown');
        if (!replay){
            for (var i in keyDownIntervalIds) {
                clearInterval(keyDownIntervalIds[i]);
            }
        } else {
            window.clearTimeout(replayTimeoutId);
        }    
        bindActions('keydown',function(event) {
            var command = Object.keys(actions).filter(function(key) {
                return actions[key] === event.which;
            });
            if ((command[0] === 'pause')&&(onPause)) {
                tThis.pauseDialog.close();
                return;
            }
        });
    };
    var gameOver = function(){
        wasReplay = replay;
        var currentHighscore = getHighScore();
        if(currentHighscore) {
            if (points > currentHighscore){
                tThis.gOverDialog.open('win');
                if (!wasReplay) {
                    setHighScore(points);
                }
            } else {
                tThis.gOverDialog.open('lose');
            }
        } else {
            tThis.gOverDialog.open('first');
            if (!wasReplay) { setHighScore(points); }
        }
    };
    this.helpDialog = initParams.helpDialog||{
        open: function(){
            if (onPause||onHelp||gOver) return;
            onHelp = true;
            stop();
            //$('#dialog-message-help').dialog('open');
            //TODO: send open dialog to client 
        },
        close: function(){
            //$('#dialog-message-help').dialog("close");
            //jquery-ui dialog sets close bind to onClose execution
            //TODO: send close dialog to client 
        },
        onClose: function(){
            if (!onHelp) return;
            tThis.go();
            onHelp=false; 
        }
    };
    this.pauseDialog = initParams.pauseDialog||{
        open: function(){
            if (onPause||onHelp||gOver) return;
            onPause = true;
            stop();
            //$('#dialog-message-pause').dialog('open');
            //TODO: send open dialog to client 
        },
        close: function(){
            //$('#dialog-message-pause').dialog('close');
            //jquery-ui dialog sets close bind to onClose execution
            //TODO: send close dialog to client 
        },
        onClose: function(){
            if (!onPause) return;
            tThis.go();
            onPause=false; 
        }
    };
    this.gOverDialog = initParams.gOverDialog||{
        open: function(result){
            gOver = true;
            stop();
            replay = false;
            switch (result){
                case 'lose': 
                    /*$('.yourscore').text(points);
                    $('.highscore').text(getHighScore());
                    $('#first').hide(); 
                    $('#win').hide();
                    $('#lose').show(); 
                    $('#dialog-message-gover').dialog('open');*/
                    //TODO: send open dialog to client 
                    break;
                case 'win': 
                    /*$('.yourscore').text(points);
                    $('.highscore').text(getHighScore());
                    $('#first').hide();
                    $('#lose').hide();
                    $('#win').show();
                    $('#dialog-message-gover').dialog('open');*/
                    //TODO: send open dialog to client 
                    break;
                case 'first':
                    /*$('.yourscore').text(points);
                    $('#win').hide();
                    $('#lose').hide();
                    $('#first').show(); 
                    $('#dialog-message-gover').dialog('open');*/
                    //TODO: send open dialog to client 
                    break;
            }
        },
        close: function(){
            //$('#dialog-message-gover').dialog('close');
            //jquery-ui dialog sets close bind to onClose execution
            //TODO: send close dialog to client 
        },
        onClose: function(){
            gOver = false;
            tThis.restart();
        }
    };
    this.setReplay = function(){
        if (
            wasReplay
        ){ //means re-replay
            actionBuffersRecord = tempActionBuffersRecord.slice(0);
            tetrominosRecord = tempTetrominosRecord.slice(0);
            processIntervalsRecord = tempProcessIntervalsRecord.slice(0);
        };
        replay = true;
    };
    this.restart = function(){
        tThis.start(); 
    };
};
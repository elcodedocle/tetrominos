/*jslint vars: true, passfail: false */
/*global WorldImageProto, $ */
var ClientEngineProto = function(initParams){

    'use strict';

    var tThis = this;
    initParams = initParams||{};
    this.geinitParams = function (){return initParams;};
    var replay = initParams.replay||false;
    var wasReplay = initParams.wasReplay||false;
    this.isReplay = function(){return replay;}; 
    var gridsRecord = initParams.gridsRecord||[];
    var gridProcessIntervalsRecord = initParams.gridProcessIntervalsRecord||[];
    var tempGridsRecord = initParams.tempGridsRecord||[];
    var tempProcessIntervalsRecord = initParams.tempProcessIntervalsRecord||[];
    var replaySpeed = initParams.replaySpeed||1;
    var replayTimeoutId;
    var gridProcessTimeStamp = initParams.gridProcessTimeStamp||null;
    var tWorld = initParams.tWorld||null; 
    this.getWorld = function(){ return tWorld; };
    var actionsBuffer = initParams.actionsBuffer||[];
    var tTromino = initParams.tTromino||null; 
    var lines = initParams.lines||null; 
    var points = initParams.points||null; 
    var startLevel = initParams.startLevel||null; 
    var level = initParams.level||null; 
    var setLinesDisplayText = initParams.setLinesDisplayText||function(text){
        $('#lines').text(text);
    };
    var setScoreDisplayText = initParams.setScoreDisplayText||function(text){
        $('#score').text(text);
    };
    var getHighScore = initParams.$getHighScore||function(){ 
        //return localStorage.getItem('tetrominos-highscore');
        //TODO: get highscore from websocket server 
    };
    var setLevelDisplayText = initParams.setLevelDisplayText||function(text){
        $('#level').text(text);
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
        return $(window).bind(action, func);
    };
    var unbindActions = initParams.unbindActions||function(action){
        return $(window).unbind(action);
    };
    var gridProcess = function(serverResponse) {
        //TODO: do what the server says
    };
    this.pushAction = function(action){
        if (replay||onHelp||onPause||gOver) { return; }
        if (actionsBuffer.length===0){
            actionsBuffer.push(action);
            gridProcess();
        } else {
            actionsBuffer.push(action);
        }
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
        tWorld = sIParams.tWorl||
            sIParams.tWorldInitParams?
                new WorldImageProto(sIParams.tWorldInitParams):
                new WorldImageProto({tEngine:tThis});
        var imageObj = new Image();
        imageObj.onload = function() {
            tWorld.setBGImage(imageObj);
        };
        imageObj.src = 'kitty_bg.jpg';
        tWorld.$windowResize(); //disgusting (less than before).
        tempGridsRecord = sIParams.tempGridsRecord||[];
        tempProcessIntervalsRecord = sIParams.tempProcessIntervalsRecord||[];
        var tInitParams;
        if (!replay){
            gridsRecord = sIParams.gridsRecord||[];
            gridProcessIntervalsRecord = sIParams.gridProcessIntervalsRecord||[];
        } else {
            replaySpeed = 1;
        }
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
        gridProcessTimeStamp = new Date().getTime();
        gridProcess();
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
            $('#dialog-message-help').dialog('open');
        },
        close: function(){
            $('#dialog-message-help').dialog("close");
            //jquery-ui dialog sets close bind to onClose execution
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
            $('#dialog-message-pause').dialog('open');
        },
        close: function(){
            $('#dialog-message-pause').dialog('close');
            //jquery-ui dialog sets close bind to onClose execution
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
                    $('.yourscore').text(points);
                    $('.highscore').text(getHighScore());
                    $('#first').hide(); 
                    $('#win').hide();
                    $('#lose').show(); 
                    $('#dialog-message-gover').dialog('open');
                    break;
                case 'win': 
                    $('.yourscore').text(points);
                    $('.highscore').text(getHighScore());
                    $('#first').hide();
                    $('#lose').hide();
                    $('#win').show();
                    $('#dialog-message-gover').dialog('open');
                    break;
                case 'first':
                    $('.yourscore').text(points);
                    $('#win').hide();
                    $('#lose').hide();
                    $('#first').show(); 
                    $('#dialog-message-gover').dialog('open');
                    break;
            }
        },
        close: function(){
            $('#dialog-message-gover').dialog('close');
            //jquery-ui dialog sets close bind to onClose execution
        },
        onClose: function(){
            gOver = false;
            tThis.restart();
        }
    };
    this.setReplay = function(){
        replay = true;
    };
    this.restart = function(){
        tWorld.destroy(); 
        tThis.start(); 
    };
};
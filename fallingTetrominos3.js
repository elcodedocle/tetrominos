/**
 * Tetrominos v0.3: html5 *etris clone from scratch
 * Copyright (C) 2013 Gael Abadin
 * 
 * TODO:
 *  
 * Menu: 
 *  -Select start level
 *  -High scores chart
 *  -Restart
 *  -Key remapping
 *  -Show Next tetromino
 *  -Start on random map
 *  -Dynamic random map (grows a row per timeout during gameplay)
 *  -2 player
 *  -2 player online
 *  -Touch controls for tablets and smartphones
 *  -Impossibru mode, quadrapassel algorithm (worst is always next) 
 * 
 * I'll be shitting all over my bad coding practices and poor 
 * js skills during all the rest of this file, but I need much 
 * more than that, so feel free to pull-request your own WTFs 
 * to github.com/elcodedocle
 * 
 */
/*jslint vars: true, passfail: false */
/*global $, Kinetic */
var worldClass = function(initParams) {
    /**
     * Defines and updates a World, which consists on:
     * a grid of square-shaped cells on an html5 canvas, 
     * a map that keeps track of which cells are filled,
     * and a draw function to fill/clear those cells
     * and update the map.
     * 
     * Faking singleton classes is not the most javascripty 
     * thing to do but what can I say: I'm a classy man. 
     * (__comedic drum, recorded laughs__)
     *  
     */
    
    'use strict';
    var tThis = this;
    initParams = initParams||{};
    this.geinitParams = function (){return initParams;};
    var tEngine = initParams.tEngine;
    var grid=initParams.grid||null, cell=initParams.cell||null;
    var bgImage = initParams.bgImage||new Kinetic.Image({
        x: 0,
        y: 0,
        image: new Image(),
        width: 100, //overrided by $windowResize
        height: 100 //overrided by $windowResize
    });
    var stage = initParams.stage||new Kinetic.Stage({
        container: 'board'
    });
    var touchPos = initParams.touchPos||{};
    var itsATap = initParams.itsATap||false;
    //if fullBoard is set to true, calling windowResize will only display the 
    //board (tWorld) and hide panel, header, footer and anything else.
    var fullBoard = initParams.fullBoard||false; 
    this.getFullBoard = function(){
        return fullBoard;
    };
    var layer = initParams.layer||new Kinetic.Layer();
    var bigButton = new Kinetic.Rect({
        opacity: 0,
        x: 0,
        y: 0,
        width: 100, //overrided by $windowResize
        height: 100 //overrided by $windowResize
    });
    layer.add(bigButton);
    stage.add(layer);
    var textSize = initParams.textSize||$('p').css('font-size');
    var text = new Kinetic.Text({
        x:  textSize, //overrided by $windowResize
        y:  textSize, //overrided by $windowResize
        fontFamily: 'Roboto',
        fontSize: textSize, //overrided by $windowResize
        text: '',
        fill: 'black'
    });
    layer.add(text);
    this.writeMessage = function(message) {
        text.setText(message);
    };
    var setCell = function(){
        cell = {
            width : stage.getWidth() / grid.width,
            height : stage.getHeight() / grid.height
        };
    };
    this.resize = function(cWidth, cHeight){
        text.setAttr('fontSize', 14*cHeight/480);
        stage.setSize(cWidth, cHeight);
        bigButton.setSize(cWidth, cHeight);
        bgImage.setSize(cWidth, cHeight);
        layer.setSize(cWidth, cHeight);
        setCell();
        tThis.redrawDirtyCells(true);
    };
    this.$windowResize = initParams.$windowResize||function() {
        return $(window).resize();
    };
    this.setBGImage = function(imageObj){
        bgImage.setSize(layer.getSize());
        bgImage.setImage(imageObj);
        layer.add(bgImage);
        tThis.$windowResize(); //WHY ???
    };
    bigButton.on('tap', function(evt) {
        evt.cancelBubble = true;
        if (itsATap){ 
            tEngine.pushAction('rotateLeft'); 
            if (!fullBoard){
                fullBoard=true;
                tThis.$windowResize();
            } 
        }
    });
    bigButton.on('touchstart', function(evt) {
        evt.cancelBubble = true;
        itsATap = true;
        touchPos=stage.getTouchPosition();
    });
    bigButton.on('touchmove', function(evt) {
        evt.cancelBubble = true;
        itsATap = false;
        var curTouchPos = stage.getTouchPosition();
        if (touchPos.x>curTouchPos.x){
            var cells = Math.floor(
                touchPos.x/cell.width-curTouchPos.x/cell.width
            );
            for (var i =0; 
                i<cells; 
                i++
            ){
                tEngine.pushAction('moveLeft');
            }
            if (tEngine.isReplay()){
                if (cells>0) { tEngine.decreaseReplaySpeed(); }
            }
            if (cells>0) touchPos = curTouchPos;
        } else {
            var cells = Math.floor(
                curTouchPos.x/cell.width-touchPos.x/cell.width
            );
            for (
                var i =0; 
                i<cells; 
                i++
            ){
                tEngine.pushAction('moveRight');
            }
            if (tEngine.isReplay()){
                if (cells>0) { tEngine.increaseReplaySpeed(); }
            }
            if (cells>0) touchPos = curTouchPos;
        }
        if (curTouchPos.y>touchPos.y){
            var cells = Math.floor(
                curTouchPos.y/cell.height-touchPos.y/cell.height
            );
            for (
                var i =0; 
                i<cells; 
                i++
            ){
                tEngine.pushAction('moveDown');
            }
            if (cells>0) touchPos = curTouchPos;
        }
    });
    
    if (initParams.worldMap ===  undefined){
        grid = initParams.grid||{
            width : 10,
            height : 20,
            content : [],
            dirty : [],
            shape : []
        };
        setCell();
    } else {
        //some exception handling would be nice...
        grid = initParams.worldMap.grid;
        setCell();
    }
    for (var i=0;i<grid.width;i++){
        grid.content.push([]);
        grid.dirty.push([]);
        grid.shape.push([]);
        for (var j=0;j<grid.height;j++){
            grid.content[i].push('clear');
            grid.dirty[i].push(false);
        }
    }
    this.getGridParams = function(){ 
        return {width: grid.width, height: grid.height}; 
    };

    this.isClear = function(x,y){
        if (y<0) return true; //over the top is always clear
        if (x<0||x>=grid.width||y>=grid.height) return false;
        if (grid.content[x][y] === 'clear' ||
            grid.content[x][y] === undefined) {
            return true; 
        }
        return false;
    };
    
    this.getFullRows = function(){
        var fullRows = [];
        for (var i=0;i<grid.height;i++){
            var incount = 0;
            for (var j=0;j<grid.width;j++){
                if (grid.content[j][i]!==undefined &&
                    grid.content[j][i]!=='clear') incount++;
            }
            if (incount === grid.width) fullRows.push(i);
        }
        return fullRows;
    };
    
    this.updateGridPos = function(fillColor,pos) {
        for (var i in pos.x) {
            grid.content[pos.x[i]][pos.y[i]] = fillColor;
            grid.dirty[pos.x[i]][pos.y[i]] = true;
        }
    };
    this.updateGridRows = function (fullRows){
        var stop = Math.max.apply(null,fullRows);
        if (stop === -Infinity) return;
        for (var l in fullRows){
            var y=fullRows[l];
            //TODO: handle special case y==0
            var skyLinePeak = tEngine.getSkyLinePeak();
            for (var i=y-1;i>=skyLinePeak;i--){
                for (var j=0;j<grid.width;j++){
                    if (grid.content[j][i+1]!==grid.content[j][i]){
                        grid.dirty[j][i+1] = true;
                    }
                    grid.content[j][i+1]=grid.content[j][i];
                }
            }
        }
    };
    this.redrawDirtyCells = function(assumeDirty){
        assumeDirty = assumeDirty||false;
        for (var x=0;x<grid.width;x++){
            for (var y=0;y<=grid.height;y++){
                if (
                    (grid.content[x][y] !== undefined) &&
                    (grid.dirty[x][y]||assumeDirty)
                ){
                    if (grid.shape[x][y]) { grid.shape[x][y].destroy(); }
                    if (grid.content[x][y] !== 'clear'){
                        grid.shape[x][y] = new Kinetic.Rect({
                            fill: grid.content[x][y],
                            shadowEnabled: false,
                            strokeEnabled: false,
                            x: Math.round(x*cell.width), 
                            y: Math.round(y*cell.height), 
                            width: Math.round(cell.width), 
                            height: Math.round(cell.height)
                        });
                        layer.add(grid.shape[x][y]);
                    }
                    grid.dirty[x][y]=false;
                }
            }
        }
        text.moveToTop();
        bigButton.moveToTop();
        stage.draw();
    };
    this.destroy = function(){
        layer.destroyChildren();
        layer.destroy();
        stage.destroyChildren();
        stage.destroy();
    };
};

var tEngineClass = function(initParams){
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
        $('#lines').text(text);
    };
    var setScoreDisplayText = initParams.setScoreDisplayText||function(text){
        $('#score').text(text);
    };
    var getHighScore = initParams.$getHighScore||function(){ 
        return localStorage.getItem('tetrominos-highscore'); 
    };
    var setHighScore = initParams.$setHighScore||function(){ 
        return localStorage.setItem('tetrominos-highscore', points);
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
        help : 72,
    };
    var bindActions = initParams.bindActions||function(action, func){
        return $(window).bind(action, func);
    };
    var unbindActions = initParams.unbindActions||function(action){
        return $(window).unbind(action);
    };
    this.pushAction = function(action){
        if (replay||onHelp||onPause||gOver) return;
        if (actionsBuffer.length===0){
            actionsBuffer.push(action);
            process();
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
                                  + 500*tEngine.getLevel()/tTromino.fallInterval
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
        tWorld = sIParams.tWorld?
            sIParams.tWorld:
            sIParams.tWorldInitParams?
                new worldClass(sIParams.tWorldInitParams):
                new worldClass({tEngine:tThis});
        var imageObj = new Image();
        imageObj.onload = function() {
            tWorld.setBGImage(imageObj);
        };
        imageObj.src = 'kitty_bg.jpg';
        tWorld.$windowResize(); //disgusting (less than before).
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
                t:tTrominoClass.types(Math.floor(Math.random() * 7)),
                r:0
            };
            tetrominosRecord.push(tInitParams);
        } else {
            replaySpeed = 1;
            tInitParams = tetrominosRecord.shift();
            tempTetrominosRecord.push(tInitParams);
        }
        tTromino = new tTrominoClass(
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
    var process = function() {
        var action;
        if (actionsBuffer===undefined){
            return;
        } else {
            if (!replay) { 
                actionBuffersRecord.push(actionsBuffer.slice(0));
                var now = new Date().getTime();
                var processInterval = now - lastProcessTimeStamp;
                lastProcessTimeStamp = now;
                processIntervalsRecord.push(processInterval);
            }
            while ((action = actionsBuffer.shift())!==undefined){
                var t = tTromino.getType();
                var l = tTrominoClass.rotations(t).length;
                var v = tTromino.vector;
                var p = tTromino.getPosition();
                p.x+=v[0];
                p.y+=v[1];
                var r = tTromino.getRotation(v[2]);
                switch (action) {
                    case 'moveDown' :
                        if (
                            getBorder(
                                tTrominoClass.getCoordinates(
                                    t,
                                    {x:p.x,y:p.y+1},
                                    r
                                )
                            ).distance>=0
                        ) {
                            tTromino.vector[1]++;
                        } else {
                            resolve();
                        }
                        break;
                    case 'moveLeft' :
                        if (
                            getBorder(
                                tTrominoClass.getCoordinates(
                                    t,
                                    {x:p.x-1,y:p.y},
                                    r
                                )
                            ).distance>=0
                        ) {
                            tTromino.vector[0]--;
                        }
                        break;
                    case 'moveRight':
                        if (
                            getBorder(
                                tTrominoClass.getCoordinates(
                                    t,
                                    {x:p.x+1,y:p.y},
                                    r
                                )
                            ).distance>=0
                        ) {
                            tTromino.vector[0]++;
                        }
                        break;
                    case 'rotateLeft':
                        if (
                            getBorder(
                                tTrominoClass.getCoordinates(t,p,(r+l-1)%l)
                            ).distance>=0
                        ) {
                            tTromino.vector[2]--;
                        }
                        break;
                    case 'rotateRight':
                        if (
                            getBorder(
                                tTrominoClass.getCoordinates(t,p,(r+1)%l)
                            ).distance>=0
                        ) {
                            tTromino.vector[2]++;
                        }
                        break;
                    case 'drop':
                        tTromino.vector[1]+=(
                            getBorder(
                                tTrominoClass.getCoordinates(t,{x:p.x,y:p.y},r)
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
        }
        move();
        tWorld.redrawDirtyCells();
        if (replay&&!onPause&&!onHelp) {processActionsRecord();}
    };
    var move = function() {
        tWorld.updateGridPos('clear',tTromino.getCurrentCoordinates());
        tTromino.updatePosition();
        tWorld.updateGridPos(
            tTrominoClass.colors(tTromino.getType()),
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
                    t:tTrominoClass.types(Math.floor(Math.random() * 7)),
                    r:0
                };
                tetrominosRecord.push(tInitParams);
            } else {
                tInitParams = tetrominosRecord.shift();
                tempTetrominosRecord.push(tInitParams);
            }
            tTromino = new tTrominoClass(
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
        tWorld.destroy(); 
        tThis.start(); 
    };
};


var tTrominoClass = function(engine, positionX,positionY,tType,rot) {
    /**
     * Defines a tetromino-shaped entity the player can interact with by 
     * rotating it left or right or moving it sideways or downwards one cell 
     * at a time across the empty cells of the world's grid.
     * 
     * The entity will also trigger its move by itself, going downwards one 
     * cell at a time at a rate given by the game engine's level setting, 
     * providing the game is not paused.
     * 
     */
    
    'use strict';
    
    var tThis = this;
    var engine = tEngine;
    var position = (positionX===undefined||positionY===undefined)?{
        x : 0,
        y : 0
    }:{
        x:positionX,
        y:positionY
    };
    var type = (tType===undefined)?
        this.types(Math.floor(Math.random() * 7)):
        tType;
    var rotation = (rot===undefined)?0:rot;
    var fallIntervalId = undefined;
    this.fallInterval = 1000;
    this.vector = [ 0, 0, 0 ];
    this.getType = function(){return type;};
    this.getPosition = function(){return position;};
    this.getRotation = function(count){
        return (rotation
                + tTrominoClass.rotations(type).length 
                + (count % tTrominoClass.rotations(type).length))
                % tTrominoClass.rotations(type).length;
    };
    this.getCurrentCoordinates = function(){
        return tTrominoClass.getCoordinates(type,position,rotation);
    };
    this.isCurrent = function(x,y){
        var pos = this.getCurrentCoordinates();
        for (var i in pos.x){
            if (x === pos.x[i] && y === pos.y[i]){
                return true;
            }
        }
        return false;
    };
    this.go = function(){
        fallIntervalId=setInterval(
            function(){engine.pushAction('moveDown');},
            Math.ceil(
                1000/(
                    1000/tThis.fallInterval
                   +(500*engine.getLevel()/tThis.fallInterval)
                )
            )
        );
    };
    this.stop = function(){
        clearInterval(fallIntervalId);
    };
    this.updatePosition = function(){
        position.x += tThis.vector[0];
        position.y += tThis.vector[1];
        rotation = tThis.getRotation(tThis.vector[2]);
        tThis.vector = [ 0, 0, 0 ];
    };
    tTrominoClass.getCoordinates = function(type,position,rotation) {
        var pos = {
            x : [],
            y : []
        };
        var rots = tTrominoClass.rotations(type);
        for ( var i = 0;i<rots[rotation].x.length;i++) {
            pos.x.push(rots[rotation].x[i] + position.x);
            pos.y.push(rots[rotation].y[i] + position.y);
        }
        return pos;
    };
    
    tTrominoClass.colors = function(type) {
        var colors = {
            I : '#000',
            O : '#f00',
            T : '#0ff',
            J : '#00f',
            L : '#ff0',
            S : '#f0f',
            Z : '#0f0'  
        };
        return colors[type];
    };
};
tTrominoClass.rotations = function(type){
    var rotations = { I:[{x:[0,1,2,3],y:[0,0,0,0]},
                         {x:[1,1,1,1],y:[-2,-1,0,1]}],
                      O:[{x:[0,0,1,1],y:[0,1,0,1]}],
                      T:[{x:[0,1,1,2],y:[0,1,0,0]},
                         {x:[0,1,1,1],y:[0,1,0,-1]},
                         {x:[1,0,1,2],y:[-1,0,0,0]},
                         {x:[1,1,1,2],y:[-1,1,0,0]}],
                      J:[{x:[0,1,2,2],y:[0,0,0,1]},
                         {x:[1,1,0,1],y:[-1,0,1,1]},
                         {x:[0,0,1,2],y:[-1,0,0,0]},
                         {x:[0,0,0,1],y:[-1,0,1,-1]}],
                      L:[{x:[1,0,0,2],y:[0,0,1,0]},
                         {x:[0,1,1,1],y:[-1,-1,0,1]},
                         {x:[1,0,2,2],y:[0,0,-1,0]},
                         {x:[0,0,0,1],y:[-1,0,1,1]}],
                      S:[{x:[1,2,0,1],y:[0,0,1,1]},
                         {x:[0,0,1,1],y:[-1,0,0,1]}],
                      Z:[{x:[0,1,1,2],y:[0,0,1,1]},
                         {x:[1,0,1,0],y:[-1,0,0,1]}]
                    };
    return rotations[type];
};
tTrominoClass.types = function (index){ 
    var types = [ 'I', 'O', 'T', 'J', 'L', 'S', 'Z' ];
    return types[index];
};
    
/**
 * Ride on!
 */
$(document).ready(function() {
    $(window).resize(function() {
        var fullBoard = tEngine?tEngine.getWorld().getFullBoard():false;
        var wWidth = $(window).width()*(fullBoard?0.98:0.85);
        var wHeight = $(window).height()*(fullBoard?0.98:0.85);
        var tHeight = Math.min(2*wWidth, wHeight);
        tHeight -= fullBoard?tHeight%20:(((0.85*tHeight)%20)/0.85);
        var hHeight = 0.05*tHeight;
        var cHeight = fullBoard?tHeight:0.85*tHeight;
        var cWidth = cHeight/2;
        var tWidth = fullBoard?cWidth:2*cWidth+0.003*tHeight; 
        var fHeight = 0.10 * tHeight;
        
        $('#game').height(cHeight);
        $('#game').width(tWidth);
        $('#board').height(cHeight);
        $('#board').width(cWidth);
        if (fullBoard){
            $('#header').hide();
            $('#panel').hide();
            $('#footer').hide();
        } else {
            $('#header').show();
            $('#panel').show();
            $('#footer').show();
            $('#panel').height(cHeight);
            $('#panel').width(cWidth);
            $('#panel').css('border-left-width', 0.003*tHeight + 'px');
            $('.display').css('margin-top', 0.17*tHeight + 'px');
            $('.display').css('font-size', 0.04*tHeight + 'px');
            $('p').css('font-size', 0.03*tHeight + 'px');
            $('#dialog-message-help p').css('font-size', 0.025*tHeight + 'px');
            $('h1').css('font-size', 0.06*tHeight + 'px');
        }
        tEngine.getWorld().resize(cWidth, cHeight);
    });
    tEngine = new tEngineClass();
    $('#dialog-message-help').dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }
        },
        close: function(event, ui) { tEngine.helpDialog.onClose(); }
    });
    $('#dialog-message-pause').dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }
        },
        close: function(event, ui) { tEngine.pauseDialog.onClose(); }
    });
    $('#dialog-message-gover').dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Replay": function() {
                tEngine.setReplay();
                $(this).dialog("close");
            },
            Ok: function() {
                $(this).dialog("close");
            }
        },
        close: function(event, ui) { tEngine.gOverDialog.onClose(); }
    });
    tEngine.start();
    document.addEventListener('touchstart', function(e) {
        if (!tEngine.getOnHelp()&&!tEngine.getOnPause()) { 
            if (tEngine.isReplay()) {
                tEngine.helpDialog.open();
            }
            else {
                tEngine.pushAction('help');
            }
        }
    }, false);
    //var fps = 0;
    //setInterval(function(){fps++;},0);
    //setInterval(function(){console.log("fps: "+fps);fps=0;},1000);
});

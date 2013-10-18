/**
 * Tetrominos v0.3: html5 *etris clone from scratch
 * Copyright (C) 2013 Gael Abadin
 * 
 * TODO:
 * 
 * Store highest score locally (no name)
 * Menu: 
 *  -Select start level
 *  -High scores chart
 *  -Restart
 *  -Key remapping
 *  -Show Next tetromino
 *  -Start on random map
 *  -Dynamic random map (grows a line per timeout during gameplay)
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

function worldClass(worldMap) {
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
    
    var canvas=null, context=null, grid=null, cell=null;
    
    var setCell = function(){
        cell = {
            width : Math.floor(canvas.width
                    / grid.width),
            height : Math.floor(canvas.height
                    / grid.height)
        };
    };
    this.setCanvas = function(c){
        //some exception handling would be nice...
        canvas = c;
        canvas.width = canvas.width;
        context = canvas.getContext('2d');
        setCell();
    };  
    this.getCanvas = function(){ return canvas; };
    
    if (worldMap ===  undefined){
        grid = {
            width : 10,
            height : 20,
            content : []
        };
        this.setCanvas($('#tcanvas')[0]);
    } else {
        //some exception handling would be nice...
        grid = worldMap.grid;
        this.setCanvas(worldMap.canvas);
    }
    for (var i=0;i<grid.width;i++){
        grid.content.push([]);
        for (var j=0;j<grid.height;j++){
            grid.content[i].push('clear');
        }
    }
    this.getGridParams = function(){ return {width: grid.width, height: grid.height}; };

    this.isClear = function(x,y){
        if (y<0) return true;
        if (x<0||x>=grid.width||y>=grid.height) return false;
        if (grid.content[x][y] === 'clear' ||
            grid.content[x][y] === undefined) {
            return true; 
        }
        return false;
    };
    
    this.countLines = function(){
        //count and countLines are shitty names
        var count = [];
        for (var i=0;i<grid.height;i++){
            var incount = 0;
            for (var j=0;j<grid.width;j++){
                if (grid.content[j][i]!==undefined &&
                    grid.content[j][i]!=='clear') incount++;
            }
            if (incount === grid.width) count.push(i);
        }
        return count;
    };
    
    this.draw = function(fillColor,pos) {
        //a little big ol' fashioned console debugging:
        //console.log('draw: '+fillColor);
        //console.log(pos);
        context.lineWidth = 1;
        var fComm;
        if (fillColor==='clear'){
            fComm = 'clearRect';
        } else {
            fComm='fillRect';
            context.strokeStyle = fillColor;
            context.fillStyle = fillColor;
        }
        for (var i in pos.x) {
            context[fComm](pos.x[i]*cell.width, pos.y[i]*cell.height, cell.width, cell.height);
            grid.content[pos.x[i]][pos.y[i]] = fillColor;
        }
        // context.strokeRect( pos.x[i], pos.y[i], cell.width,
        // cell.height ); 
        // (nothing but a reminder of the existence of strokeRect)
    };
    this.updateGrid = function(count){
        //count is a shitty name for this var
        var stop = Math.max.apply(null,count);
        if (stop === -Infinity) return;
        for (var l in count){
            var y=count[l];
            for (var i=y-1;i>=0;i--){
                for (var j=0;j<grid.width;j++){
                    grid.content[j][i+1]=grid.content[j][i];
                }
            }
        }
        context.lineWidth = 1;
        for (var x=0;x<grid.width;x++){
            for (var y=0;y<=stop;y++){
                if (grid.content[x][y] !== undefined){
                    var fComm;
                    if (grid.content[x][y] === 'clear'){
                        fComm = 'clearRect';
                    } else {
                        fComm='fillRect';
                        context.fillStyle = grid.content[x][y];
                    }
                    context[fComm](x*cell.width, y*cell.height, cell.width, cell.height);
                }
            }
        }
    };
}

function tEngineClass(){
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
     * regularly (100/(2*level+1) ms interval) by function process().
     * 
     */
    var tThis=this;
    var tWorld = null;
    var actionsBuffer = [];
    var tTromino = null;
    var lines = null;
    var points = null;
    var level = null;
    this.getLevel = function(){return level;};
    var startLevel = 0;
    var processInterval = 100;
    var processIntervalId = undefined;
    var keyDownInterval = 200;
    var keyDownIntervalIds = {
        rotateLeft : undefined,
        rotateRight : undefined,
        moveLeft : undefined,
        moveRight : undefined,
        next : undefined,
        pause : undefined
    };
    var actions = {
        rotateLeft : tEngineClass.keyValue('a'),
        rotateRight : tEngineClass.keyValue('d'),
        moveLeft : tEngineClass.keyValue('leftArrow'),
        moveRight : tEngineClass.keyValue('rightArrow'),
        moveDown : tEngineClass.keyValue('downArrow'),
        drop : tEngineClass.keyValue('spacebar'),
        pause : tEngineClass.keyValue('p'),
        help : tEngineClass.keyValue('h'),
        restart : tEngineClass.keyValue('r')
    };
    var move = function() {
        tWorld.draw('clear',tTromino.getCurrentCoordinates());
        tTromino.updatePosition();
        tWorld.draw(tTrominoClass.colors(tTromino.getType()),tTromino.getCurrentCoordinates());
    };
    var isAvailable = function(pos){
        for (var j in pos.x){
            if ((!tWorld.isClear(pos.x[j],pos.y[j]) &&
                !tTromino.isCurrent(pos.x[j],pos.y[j])) ||//(!free && !myself)
                (pos.y[j]>=tWorld.getGridParams().height) || //|| overflow(down)
                (pos.x[j]>=tWorld.getGridParams().width) || // || overflow(right)
                (pos.x[j]<0)){                             //  || overflow(left)
                return false;
            }
        }
        return true;
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
         * 1)if lines to chop:
         * -chop lines,
         * -increase lines,(level),points
         * -test end of game
         * 
         * 2)If not EOG: call new tetromino
         * 
         * `count` is a shitty name for a list  of lines to chop.
         * `countLines()` is a textbook case of naming convention misguidancy.
         * 
         */
        var count = tWorld.countLines();
        tWorld.updateGrid(count);
        
        lines+=count.length;
        points+=count.length*count.length*200;
        level = startLevel + Math.floor(lines/10);
        
        $('#level').text(level);
        $('#lines').text(lines);
        $('#score').text(points);
        //console.log('lines: '+lines);
        //console.log('points: '+points);
        //console.log('level: '+level);
        var bOver = false;
        var coords = tTromino.getCurrentCoordinates();
        for ( var i = 0;i<coords.y.length;i++) {
            if (coords.y[i]<0){
                gameOver();
                bOver = true;
                break;
            }
        } 
        if (!bOver){
            tTromino.stop();
            tTromino = new tTrominoClass(
                    actionsBuffer,
                    Math.floor(tWorld.getGridParams().width / 2) - 1, 
                    -1,
                    tTrominoClass.types(Math.floor(Math.random() * 7)),
                    0);
            tTromino.go();
        }
    };
    var process = function() {
        if (!actionsBuffer)
            return;
        var action = actionsBuffer.shift();
        var t = tTromino.getType();
        var p = tTromino.getPosition();
        //console.log(action);
        //console.log(t);
        //console.log(p);
        //console.log(tTrominoClass.rotations(t));
        var l = tTrominoClass.rotations(t).length;
        var r = tTromino.getRotation();

        
        if (action === 'moveDown') {
            //console.log(getBorder(tTrominoClass.getCoordinates(t,{x:p.x,y:p.y+1},r)).distance);
            if (getBorder(tTrominoClass.getCoordinates(t,{x:p.x,y:p.y+1},r)).distance>=0){
                tTromino.vector[1]++;
            } else {
                resolve();
            }
        } else if (action === 'moveLeft') {
            if (getBorder(tTrominoClass.getCoordinates(t,{x:p.x-1,y:p.y},r)).distance>=0){
                tTromino.vector[0]--;
            }
        } else if (action === 'moveRight') {
            if (getBorder(tTrominoClass.getCoordinates(t,{x:p.x+1,y:p.y},r)).distance>=0){
                tTromino.vector[0]++;
            }
        } else if (action === 'rotateLeft') {
            if (getBorder(tTrominoClass.getCoordinates(t,p,(r+l-1)%l)).distance>=0){
                tTromino.vector[2]--;
            }
        } else if (action === 'rotateRight') {
            if (getBorder(tTrominoClass.getCoordinates(t,p,(r+1)%l)).distance>=0){
                tTromino.vector[2]++;
            }
        } else if (action === 'drop') {
            tTromino.vector[1]+=(getBorder(tTromino.getCurrentCoordinates()).distance);
        } else if (action === 'pause') {
            stop();
            return;
        } else if (action === 'help') {
            console.log(action);
            stop();
            $( "#dialog-message-help" ).dialog( "open" );
            return;
        } else
            return;
        move();
    };
    var keyDown = function(event) {
        
        //console.log('char:' + event.which);

        var command = Object.keys(actions).filter(function(key) {
            return actions[key] === event.which;
        });
        if (command[0] !== undefined) {
            //console.log(command[0]);
            if (keyDownIntervalIds[command[0]] === undefined) {
                actionsBuffer.push(command[0]);
                keyDownIntervalIds[command[0]] = setInterval(
                    function() {
                        actionsBuffer.push(command[0]);
                    }, 
                    keyDownInterval
                );
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
        tWorld = new worldClass();
        tTromino = new tTrominoClass(
            actionsBuffer,
            Math.floor(tWorld.getGridParams().width / 2) - 1, 
            -1,
            tTrominoClass.types(Math.floor(Math.random() * 7)),
        0);
        lines = 0;
        points = 0;
        level = startLevel;
        $('#level').text(level);
        $('#lines').text(lines);
        $('#score').text(points);
        tThis.go();
    };
    this.go = function() {
        $(window).unbind('keydown');
        $(window).keydown(keyDown);
        $(window).keyup(keyUp);
        tTromino.go();
        processIntervalId = setInterval(process,
                processInterval/(2*level+1));
    };
    var stop = function() {
        tTromino.stop();
        $(window).unbind('keydown');
        for (i in keyDownIntervalIds) {
            clearInterval(keyDownIntervalIds[i]);
        }
        clearInterval(processIntervalId);
        $(window).keydown(function(event) {
            var command = Object.keys(actions).filter(function(key) {
                return actions[key] === event.which;
            });
            if (command[0] === 'pause') {
                //console.log(command[0]);
                tThis.go();
                return;
            }
        });
    };
    var gameOver = function(){
        stop();
        $('.yourscore').text(points);
        if(localStorage.getItem('tetrominos-highscore')) {
            $('#first').hide();
            $('.highscore').text(localStorage.getItem('tetrominos-highscore'));
            if (points > localStorage.getItem('tetrominos-highscore')){ 
                $('#lose').hide();
                $('#win').show();
                localStorage.setItem('tetrominos-highscore', points);
            } else {
                $('#win').hide();
                $('#lose').show();
            }
        } else {
            $('#win').hide();
            $('#lose').hide();
            $('#first').show();
            localStorage.setItem('tetrominos-highscore', points);
        }
        $( "#dialog-message-gover" ).dialog( "open" );
    };
}

tEngineClass.keyValue = function(key){
    var keys = {
        a: 65,
        h: 72,
        d: 68,
        p: 80,
        intro : 13,
        spacebar : 32,
        leftArrow : 37,
        upArrow : 38,
        rightArrow : 39,
        downArrow : 40
    };
    return keys[key];
};

function tTrominoClass(actionsBuffer,positionX,positionY,tType,rot) {
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
    var position = (positionX===undefined||positionY===undefined)?{
        x : 0,
        y : 0
    }:{
        x:positionX,
        y:positionY
    };
    var type = (tType===undefined)?tTrominoClass.types(Math.floor(Math.random() * 7)):tType;
    var rotation = (rot===undefined)?0:rot;
    var fallInterval = 1000;
    var fallIntervalId = undefined;
    var tThis = this;
    this.vector = [ 0, 0, 0 ];
    this.getType = function(){return type;};
    this.getPosition = function(){return position;};
    this.getRotation = function(){return rotation;};
    this.getCurrentCoordinates = function (){
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
        fallIntervalId=setInterval(function(){actionsBuffer.push('moveDown');},fallInterval/(2*tEngine.getLevel()+1));
    };
    this.stop = function(){
        clearInterval(fallIntervalId);
    };
    this.updatePosition = function (){
        //console.log('x:'+position.x+', y:'+position.y);
        position.x += tThis.vector[0];
        position.y += tThis.vector[1];
        //console.log('x:'+position.x+', y:'+position.y);
        //console.log(tThis.vector);
        rotation = (rotation
                + tTrominoClass.rotations(type).length 
                + (tThis.vector[2] % tTrominoClass.rotations(type).length))
                % tTrominoClass.rotations(type).length;
        tThis.vector = [ 0, 0, 0 ];
    };
}
tTrominoClass.types = function (index){ 
    var types = [ 'I', 'O', 'T', 'J', 'L', 'S', 'Z' ];
    return types[index];
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
tTrominoClass.getCoordinates = function(type,position,rotation) {
    var pos = {
        x : [],
        y : []
    };
    var rots = tTrominoClass.rotations(type);
    //console.log(type);
    //console.log(rotation);
    //console.log(rots);
    //console.log(rots[rotation]);
    for ( var i = 0;i<rots[rotation].x.length;i++) {
        pos.x.push(rots[rotation].x[i] + position.x);
        pos.y.push(rots[rotation].y[i] + position.y);
    }
    // console.log(pos);
    return pos;
};

/**
 * Ride on!
 */
$(document).ready(function() {
    tEngine = new tEngineClass();
    tEngine.start();
    $( "#dialog-message-help" ).dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Ok: function() {
                $( this ).dialog( "close" );
            }
        },
        close: function(event, ui) { tEngine.go(); }
    });
    $( "#dialog-message-gover" ).dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Ok: function() {
                $( this ).dialog( "close" );
            }
        },
        close: function(event, ui) { tEngine.start(); }
    });
});
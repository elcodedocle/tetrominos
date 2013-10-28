/*jslint vars: true, passfail: false */
var TetrominoProto = function(engine, positionX,positionY,tType,rot) {
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
    var fallIntervalId;
    this.fallInterval = 1000;
    this.vector = [ 0, 0, 0 ];
    this.getType = function(){return type;};
    this.getPosition = function(){return position;};
    this.getRotation = function(count){
        return (rotation
                + TetrominoProto.rotations(type).length 
                + (count % TetrominoProto.rotations(type).length))
                % TetrominoProto.rotations(type).length;
    };
    this.getCurrentCoordinates = function(){
        return TetrominoProto.getCoordinates(type,position,rotation);
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
    TetrominoProto.getCoordinates = function(type,position,rotation) {
        var pos = {
            x : [],
            y : []
        };
        var rots = TetrominoProto.rotations(type);
        for ( var i = 0;i<rots[rotation].x.length;i++) {
            pos.x.push(rots[rotation].x[i] + position.x);
            pos.y.push(rots[rotation].y[i] + position.y);
        }
        return pos;
    };
    
    TetrominoProto.colors = function(type) {
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
TetrominoProto.rotations = function(type){
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
TetrominoProto.types = function (index){ 
    var types = [ 'I', 'O', 'T', 'J', 'L', 'S', 'Z' ];
    return types[index];
};
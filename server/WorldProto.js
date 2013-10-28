/*jslint vars: true, passfail: false */
var WorldProto = function(initParams) {
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
    this.getInitParams = function (){return initParams;};
    var tEngine = initParams.tEngine;
    var grid=initParams.grid||null;
    this.writeMessage = function(message) {
        //TODO: send writeMessage(message); to client
    };
    if (initParams.worldMap ===  undefined){
        grid = initParams.grid||{
            width : 10,
            height : 20,
            content : [],
            dirty : [],
            shape : []
        };
    } else {
        //some exception handling would be nice...
        grid = initParams.worldMap.grid;
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
        //TODO: send the grid to the client for redraw
        for (var x=0;x<grid.width;x++){
            for (var y=0;y<=grid.height;y++){
                if (
                    (grid.content[x][y] !== undefined) &&
                    (grid.dirty[x][y]||assumeDirty)
                ){
                    grid.dirty[x][y]=false;
                }
            }
        }
    };
};
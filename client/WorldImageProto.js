/*jslint vars: true, passfail: false */
/*global $, Kinetic */
var WorldImageProto = function(initParams) {
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
    var grid=initParams.grid||null, cell=initParams.cell||null;
    this.setGrid = function(newGrid){
        //some sanity checks here, please.
        grid = newGrid;
    };
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
    //useless loop
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
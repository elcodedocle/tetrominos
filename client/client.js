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
 *  -Impossibru mode, quadrapassel algorithm (worst is always next) 
 * 
 * I'll be shitting all over my bad coding practices and poor 
 * js skills during all the rest of this file, but I need much 
 * more than that, so feel free to pull-request your own WTFs 
 * to github.com/elcodedocle
 * 
 */
/*jslint vars: true, passfail: false */
/*global ClientEngineProto, $, io */

/**
 * Ride on!
 */
$(document).ready(function() {
    "use strict";
    var socket = io.connect();
    function sendKeyDown(event) {
        socket.emit('keyDown', event);
    }
    function sendKeyUp(event) {
        socket.emit('keyUp', event);
    }
    function sendTouchStart(event) {
        socket.emit('touchstart', event);
    }
    function sendTouchEnd(event) {
        socket.emit('touchend', event);
    }
    function sendTap(event) {
        socket.emit('tap', event);
    }
    socket.on('upDateGrid', function(data) {
        //TODO: call redraw grid method on tWorld of tEngine
    });
    var tEngine;
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
    tEngine = new ClientEngineProto();
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

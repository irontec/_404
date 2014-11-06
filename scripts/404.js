(function($){
    function init() {
        var game = {
            items: {},
            map: {},
            position: null,
            actions: {},
            phrases: {},
            paths: {},
            command: '',
            init: function(){
                $(window).on('resize', function(event){
                    game.calculateLayoutHeight();
                });
                $("#image img").on('load', function(){
                    game.calculateLayoutHeight();
                });
                $.ajax({
                    dataType: "json",
                    type: "GET",
                    url: "config/",
                    data: {data: 'config'},
                    success: function (response){
                        game.items = response.item;
                        game.actions = response.actions;
                        game.phrases = response.phrases;
                        game.paths = response.paths;
                        game.loadMap(response.firstmap);
                    }
                });
            },
            loadMap: function(position, callback){
                $.ajax({
                    dataType: "json",
                    type: "GET",
                    url: "config/",
                    data: {data: position},
                    success: function (response){
                        if (typeof game.map[position] === 'undefined') {
                            game.map[position] = response;
                        }
                        $('#title').html(game.map[position]['title']);
                        if (typeof game.map[position]['image'] !== 'undefined') {
                            $('#image img').attr('src', 'map/' + game.map[position]['image']).attr('alt', game.map[position]['title']);
                            $('#image').show();
                        } else {
                            $('#image img').removeAttr('src').removeAttr('alt');
                            $('#image').hide();
                        }
                        $('#console').empty();
                        game.write([game.map[position]['description']]);
                        game.position = position;
                        if (typeof callback === 'function') {
                            callback();
                        }
                    }
                });
            },
            bindCommand: function(){
                $('#command input').on('keypress', function(event) {
                    var code = event.keyCode || event.which;
                    if (parseInt(code) === 13) {
                        event.preventDefault();
                        event.stopPropagation();
                        game.parseCommand($(this).val());
                    }
                });
            },
            parseCommand: function(command){
                command = command.trim().replace(/\s{2,}/g, ' ').toLowerCase();
                if (command === '') {
                    return;
                }
                var args = command.match(/([a-z]+)\s?([a-z]+)?\s?([a-z\s]+)?/);
                if (args === null) {
                    return;
                }
                this.reloadCommand(command);
                var action = args[1];
                var object = typeof args[2] === 'undefined'? null : args[2];
                var complement = typeof args[3] === 'undefined'? null : args[3];
                if (this.move(action) === true) { return; }
                if (this.action(action, object, complement) === true) { return; }
                this.write([this.phrases['unknown']]);
            },
            reloadCommand: function(command){
                $('#command input').remove();
                $('<span>' + command + '</span>').appendTo('#command');
                $('#command').removeAttr('id');
            },
            getValidPaths: function(){
                var paths = [];
                for (var path in this.map[this.position]['paths']) {
                    paths.push(this.paths[path]);
                }
                return paths.join(', ');
            },
            action: function(action, object, complement){
                for (var make in this.actions) {
                    if (action === this.actions[make]['command']) {
                        if (make === 'help') {
                            this.actionHelp(object);
                        } else if (make === 'look') {
                            this.actionLook();
                        } else if (make === 'examine') {
                            this.actionExamine(object);
                        } else if (make === 'salute') {
                            this.actionSalute(object);
                        }
                        return true;
                    }
                }
                return false;
            },
            actionHelp: function(object){
                var actions = [];
                for (var action in this.actions) {
                    if (this.actions[action]['command'] === object && typeof this.actions[action]['help'] !== 'undefined') {
                        this.write([this.actions[action]['help']]);
                        return;
                    }
                    actions.push(this.actions[action]['command']);
                }
                var paths = [];
                for (var path in this.paths) {
                    paths.push(this.paths[path]);
                }
                var message = [
                    this.phrases['help']['actions'].replace('%actions%', actions.join(', ')),
                    this.phrases['help']['paths'].replace('%paths%', paths.join(', '))
                ];
                this.write(message);
            },
            actionLook: function(){
                this.write([this.map[this.position]['description']]);
            },
            actionExamine: function(object){
                var message = null;
                if (typeof this.map[this.position]['items'] !== 'undefined' && typeof this.map[this.position]['items'][object] !== 'undefined') {
                    message = this.map[this.position]['items'][object]['description'];
                } else if (typeof this.map[this.position]['people'] !== 'undefined' && typeof this.map[this.position]['people'][object] !== 'undefined') {
                    message = this.map[this.position]['people'][object]['description'];
                } else {
                    message = this.phrases['examine']
                    .replace('%object%', object);
                }
                this.write([message]);
            },
            actionSalute: function(object){
                if (typeof this.map[this.position]['people'] !== 'undefined' && typeof this.map[this.position]['people'][object] !== 'undefined') {
                    this.write([this.phrases['salute']['hello'].replace('%object%', object)], 'salute', false);
                    if (typeof this.map[this.position]['people'][object]['hello'] !== 'undefined') {
                        this.write([this.map[this.position]['people'][object]['hello']], 'salute');
                    } else {
                        this.write([this.phrases['salute']['empty'].replace('%object%', object)]);
                    }
                    return;
                }
                this.write([this.phrases['salute']['nobody'].replace('%object%', object)]);
            },
            move: function(path){
                for (var to in this.paths) {
                    if (path === this.paths[to]) {
                        if (typeof this.map[this.position]['paths'][to] === 'undefined') {
                            var message = this.phrases['badpath']
                            .replace('%path%', path)
                            .replace('%paths%', this.getValidPaths());
                            this.write([message]);
                        } else {
                            this.loadMap(this.map[this.position]['paths'][to], function(){
                                if (to === 'start') {
                                    delete game.paths['start'];
                                }
                            });
                        }
                        return true;
                    }
                }
                return false;
            },
            calculateLayoutHeight: function(){
                var height = $('#monitor').height() - 10;
                height -= $('#title').height() + 10;
                if (typeof $('#image img').attr('src') !== 'undefined') {
                    height -= $('#image').height() + 10;
                }
                $('#console').css('height', height);
                $("#console").scrollTop($("#console")[0].scrollHeight);
            },
            write: function(message, messageType, showShell){
                messageType = (typeof messageType === 'undefined')? null : messageType;
                showShell = (typeof showShell === 'undefined')? true : showShell;
                for (var index in message) {
                    $('<p class="message' + ((messageType !== null)? ' ' + messageType : '') + '">' + message[index] + '</p>').appendTo("#console");
                }
                if (showShell === true) {
                    $('<p id="command" class="shell"><span class="cursor"></span><input class="command" type="text" name="command" /></p>').appendTo("#console");
                    $('#command .command').focus();
                    this.bindCommand();
                }
                this.calculateLayoutHeight();
            }
        };
        game.init();
    }
    $(document).ready(init);
})(jQuery);
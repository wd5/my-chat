var focus;
$(document).ready(function() {
    // Постинг формы через ajax
    $("#messageform").live("keypress", function(e) {
        if (e.keyCode == 13){
            newMessage($(this));
            return false;
        }
    });
    poll();
    if (/*@cc_on!@*/false) {
        document.onfocusin = function(){
            focus = "True";
        };
        document.onfocusout = function(){
            focus = "False";
        }
    } else {
        window.onload=window.onfocus = function(){
            focus = "True";
        };
        window.onblur = function(){
            focus = "False";
        }
    }
});

// Ожидает новых сообщений
function poll(){
    // Передаю при запросе xsrf подпись
    var args = {"_xsrf": $.cookie('_xsrf')};
    $.ajax({
        type: "POST",
        url: "/a/message/updates",
        data: $.param(args),
        dataType: "text",
        success: addMessage
//        error: updater.onError});
    });
}

// Постинг сообщения в чат
function newMessage(form) {
    $.ajax({
        type: 'POST',
        url: "/a/message/new",
        // Передаю данные в виде словаря
        data: form.serializeArray(),
        success: function(){
            // Стираю набранное в строке у клиента
            $('#messageform').find("textarea").val('');
            form.slideDown();
        },
        dataType: "text"
    });
}

function addMessage(response){
    poll();
    var obj = jQuery.parseJSON(response);
    if (obj.type == 'new_message'){
        $("#inbox").append(obj.html);
    }
    else if (obj.type == 'new_user') {
        $("#inbox").append(obj.html);
        $("#nav").append(obj.user);
    }
    else if (obj.type == 'user_is_out') {
        $("#inbox").append(obj.html);
        $('#'+obj.user_id).remove();
    }
    if (focus == "False"){
        $.animateTitle(['В чате новое сообщение', '@@@@'], 500);
        $.after(4, "seconds", function() {
            $.animateTitle("clear");
        });
        $('body').append('<embed src="/static/icq.mp3" autostart="true" hidden="true" loop="false">');
    }
}

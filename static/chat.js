$(document).ready(function() {
    // Постинг формы через ajax
    $("#messageform").live("submit", function() {
        newMessage($(this));
        return false;
    });
    poll();
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
            $('#messageform').find("input:text").val('');
        },
        dataType: "text"
    });
}

function addMessage(response){
    var obj = jQuery.parseJSON(response);
    if (obj.type == 'new_message'){
        $("#inbox").append(obj.html);
    }
    else if (obj.type == 'new_user') {
        $("#inbox").append(obj.html);
        $("#users_online").append(obj.user);
    }
    else if (obj.type == 'user_is_out') {
        $("#inbox").append(obj.html);
        $('#'+obj.user_id).remove();
    }
    poll();
}

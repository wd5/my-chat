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
            // Стипаю набранное в строке у клиента
            form.find("input[type=text]").val("").select();
        },
        dataType: "text"
    });
}

function addMessage(response){
    poll();
    $("#inbox").append(response);
}

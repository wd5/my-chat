var focus;
$(document).ready(function() {
    // Постинг формы через ajax
    $("#messageform").live("keypress", function(e) {
        if (e.keyCode == 13){
            newMessage($(this));
            return false;
        }
    });
    $("#messageform input").live("click", function(event) {
        event.preventDefault();
        newMessage($('#messageform'));
    });
    //Приват
    $("#sidebar_inner a.user_nik").live("click", function(event) {
    	if($(this).hasClass('personal')){
    		$('#sidebar_inner .personal').removeClass('personal');
    		$('#private').val($(this).attr('id'));
    		$('#personal').val("");
    		$('.clone_personal').remove();
	        $('#private_name').html('<span class="closer"></span><div>Личное сообщение для '+$(this).text()+'</div>').addClass('private');
    	}else{
    		$(this).addClass('personal');
    		
    		$('#private').val("");
    		if((!($('#private_name div').length))||($('#private_name').hasClass('private'))){
    			$('#personal').val($(this).attr('id'));
    			$('#private_name').html('<span class="closer"></span><div>Обращение к '+$(this).text()+'</div>').removeClass('private');
    		}else{
	    		$('#private_name div').append(', '+$(this).text());
	    		$('#messageform').append('<input class="clone_personal" id="personal" type="hidden" value="'+($(this).attr('id'))+'" name="personal[]">');
	    	}
    	}
    	
    	
    	
    	
	    event.preventDefault();
        $('#inbox').css({paddingBottom: '135px'});
        window.scrollTo(0, document.body.scrollHeight);
        $('#message').focus();
    });
    $('#private_name .closer').live('click',function(){
    	$('#private').val("");
    	$('#personal').val("");
    	$('#private_name').html("");
    	$('.clone_personal').remove();
    	$('#inbox').css({paddingBottom: '95px'});
    	$('#sidebar_inner .personal').removeClass('personal').removeClass('private');
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
        $("#sidebar_inner").append(obj.user);
    }
    else if (obj.type == 'user_is_out') {
        $("#inbox").append(obj.html);
        $('#'+obj.user_id).remove();
    }
    if (focus == "False"){
        document.getElementById('audiotag1').play();
        $.animateTitle(['В чате новое сообщение', '@@@@'], 500);
        $.after(4, "seconds", function() {
            $.animateTitle("clear");
        });
    }
    window.scrollTo(0, document.body.scrollHeight);
}

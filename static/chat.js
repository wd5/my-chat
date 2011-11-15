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
    $("a.user_nik").live("click", function(event) {
    	event.preventDefault();
    	var tar_id = $(this).attr('id');
    	if($('#'+(tar_id)).hasClass('personal_link')||($(this).parent().parent().parent().hasClass('private'))){
    		$('.personal_link').removeClass('personal_link');
    		$('#private').val($(this).attr('id'));
    		$('#personal').val("");
    		$('.clone_personal').remove();
	        $('#private_name').html('<span class="closer"></span><div>Личное сообщение для '+$(this).text()+'</div>').addClass('private');
    	}else{	
    		$('#private').val("");
    		if((!($('#private_name div').length))||($('#private_name').hasClass('private'))){
    			$('#personal').val(tar_id);
    			$('#private_name').html('<span class="closer"></span><div>Обращение к '+$(this).text()+'</div>').removeClass('private');
    			$('a.sub_id_'+tar_id).addClass('personal_link');
    		}else{
    			if(!($('#'+(tar_id)).hasClass('personal_link'))){
	    			$('#private_name div').append(', '+$(this).text());
	    			$('#messageform').append('<input class="clone_personal" id="personal" type="hidden" value="'+(tar_id)+'" name="personal[]">');
	    			$('a.sub_id_'+tar_id).addClass('personal_link');
	    		}
	    	}
    	}
    	
    	
    	
	    
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
    	$('.personal_link').removeClass('personal_link');
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
        success: addMessage,
        error: poll()
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
        var $last = $(obj.html).appendTo("#inbox");
        if($last.hasClass('personal')){
        	setTimeout(function(){
        		$last.children('.shadow').animate({opacity:0},4000);
        	},2000)
        }
    }
    else if (obj.type == 'new_user') {
        var $last_user = $(obj.html).appendTo("#inbox");
        setTimeout(function(){
        		$last_user.children('.shadow').animate({opacity:0},4000);
        	},2000)
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

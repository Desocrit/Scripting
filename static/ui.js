
$( document ).ready(function() {
	var toolbarOpen = false;
	var navAnimationTime = 200;
	$("#toolbar").click(function() {
		if (!toolbarOpen) {
			$("#toolbar").animate({right: '0px'}, navAnimationTime, 'swing');
			toolbarOpen = true;
		} else {
			var toolbarWidth = $("#toolbar").width();
			$("#toolbar").animate({right: '-' + (toolbarWidth-15) + 'px'}, navAnimationTime, 'swing');
			toolbarOpen = false;
		}
	})
	var sidebarOpen = true;
	var sidebarWidth = $("#sidebar").width();
	var page_holderWidth = $("#page_holder").width();

	$("#navbutton").click(function() {

		if (!sidebarOpen) {
			$("#sidebar").animate({left: '0'}, navAnimationTime);
			$("#page_holder").animate({width: "85%"}, navAnimationTime);
			$("#backbutton").animate({left: '20%'}, navAnimationTime)
			$("#navbutton").text("Hide Sidebar");
			sidebarOpen = true;
		} else {
			$("#backbutton").animate({left: '5%'}, navAnimationTime)
			$("#sidebar").animate({left: '-15%'}, navAnimationTime);
			$("#page_holder").animate({width: '100%'}, navAnimationTime);
			$("#navbutton").text("Show Sidebar");
			sidebarOpen = false;
		}
	})

	$("#logout_button").click(function(event) {
		$("#front_page").css({top: "0"}).animate({opacity: 1}, 500);
		$("#container").animate({opacity: 0}, 500).css({visibility: "hidden"});
		$("header").animate({top: '-97px'}, 500);
		$("footer").animate({bottom: '-50px'}, 500);

	});

	//$("#login_button").click(function(event) {
	//	$("#front_page").animate({opacity: 0.0}).css({top: "-120%"}, 500);
	//	$("#container").css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1.0}, 500);
	//	$("header").animate({top: '0'}, 500);
	//	$("footer").animate({bottom: '0'}, 500);
	//});

	$(".menu li").on('mouseenter', function() {
		$(this).children('ul').fadeIn();
	});

	$(".menu li").on('mouseleave', function() {
		$(this).children('ul').fadeOut();
	});


});
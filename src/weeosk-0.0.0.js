function init()  {
    var ac = new ApplicationController();
}

/********** ApplicationController **********/
function ApplicationController()  {
    var that = this;
    this.svc = new SearchViewController($("#SearchView"));
    this.wvc = new WeeoskViewController($("#WeeoskView"));
    this.visibleController = this.svc;
    $("#go_button").click(function() { that.go(document.getElementById("search_term_input").value); });
    $("#restart_button").click(function() { that.toggle(); });
    $("#search_term_input").keydown(function(event)  { if(event.keyCode === 13) that.go(document.getElementById("search_term_input").value); });
}

ApplicationController.prototype.go = function(searchTerm)  {
    var that = this;
    if(searchTerm !== "")  {
	this.wvc.setSearchTerm(searchTerm);
	that.toggle();
    }
}

ApplicationController.prototype.toggle = function()  {
    var that = this;
    this.visibleController.hide();
    setTimeout(function()  {
	    if(that.visibleController === that.svc)  {
		that.wvc.show();
		that.visibleController = that.wvc;
	    }
	    else  {
		that.visibleController = that.svc;
		that.svc.show();
	    }
    }, 1000);
}
/********** End ApplicationController **********/


/********** SearchViewController ***********/
function SearchViewController(v)  {
    this.view = v;
    document.getElementById("search_term_input").value = "";
    this.show();
}

SearchViewController.prototype.show = function()  {
    this.view.fadeIn(500);
}

SearchViewController.prototype.hide = function()  {
    this.view.fadeOut(500);    
}
/********** End SearchViewController ***********/


/********** WeeoskViewController ***********/
function WeeoskViewController(v)  {
    var that = this;
    this.view = v;
    this.controlTimeout = null;

    //v.mousemove( function() { that.showControls(); } );
}

WeeoskViewController.prototype.show = function()  {
    this.view.fadeIn(500);
    this.showControls();
    $("#weeosk_item0").html("<div class='flickr'><div class='image'><img class='weeosk_image' src='images/loading.gif'></img></div></div>");
    $("#weeosk_item0").show();
    //center vertically
    var element = $("#weeosk_item0");
    var top = .5*($("#display_area").height()-element.height());
    element.css({'position':'relative','top':top+'px'});
    $("#weeosk_item1").hide();

    //create new weeosk controller with the current search term
    this.wc = new WeeoskController(this.searchTerm);
}

WeeoskViewController.prototype.showControls = function()  {
    var that = this;
    $("#controls").fadeTo(500,100);
    $("#weeosk_term").fadeTo(500,100);
    if(this.controlTimeout !== null) clearTimeout(this.controlTimeout);
    this.controlTimeout = setTimeout(function() { that.hideControls(); }, 2000);
}

WeeoskViewController.prototype.hideControls = function()  {
    //$("#weeosk_term").fadeTo(500,0);
    //$("#controls").fadeTo(500,0);
    //$("#weeosk_term").fadeOut();
    //$("#controls").fadeOut();
}

WeeoskViewController.prototype.hide = function()  {
    this.view.fadeOut(500);

    //destroy weeosk controller
    this.wc.destroy();
    $("#weeosk_item0").html("");
    $("#weeosk_item1").html("");
}

WeeoskViewController.prototype.setSearchTerm = function(term)  {
    $("#weeosk_term").text(term);
    this.searchTerm = term;
}
/********** End WeeoskViewController ***********/

/********** WeeoskController ******************/
function WeeoskController(searchTerm)  {
    if(searchTerm === null || searchTerm === undefined || searchTerm === "")
	throw new Error("undefined search term Weeosk");

    var that = this;
    var weeosk = new Weeosk();
    var timer = null;
    var fadeTime = 500;
    var displayTime = 6000;
    var spotterControllers = [];

    var displayIndex = 0;

    spotterControllers.push(new TwitterController("twitter.search",{searchString:searchTerm,frequency:60},weeosk));
    spotterControllers.push(new FlickrController("flickr.search",{api_key:"867d7e82cd6b196e83e27d308d97a7f0",tags:searchTerm,frequency:60}, weeosk));
    spotterControllers.push(new TwitpicController("twitpic.search",{searchString:searchTerm, frequency:60},weeosk));

    this.destroy = function() {
	clearTimeout(timer);
	for(var i in spotterControllers)
	    spotterControllers[i].destroy();
	setTimeout(function() {$("#weeosk_item0").html("") }, 1000);
    }

    this.play = function()  {
	if(!weeosk.ready()) {
	    setTimeout(function() { that.play(); }, 500);
	}
	else  {
	    //preload first item
	    $("#weeosk_item"+(displayIndex+1)%2).html(weeosk.currentItem());
	    timer = setInterval(function() {
		    that.display();
		}, displayTime);
	}

    }

    this.stop = function()  {
	timer = null;
    }


    /**
     * Fade out the current item
     * set the next buffered item
     * position/scale the currently buffered item
     * fade in the currently buffered item
     */
    this.display = function()  {
	$("#weeosk_item"+displayIndex).fadeOut(fadeTime, function()  {
		//increment the displayIndex
		displayIndex = (displayIndex+1)%2;
		
		//set the html of the buffer
		$("#weeosk_item"+(displayIndex+1)%2).html(weeosk.currentItem());
		

		//fade in the currently buffered item
		$("#weeosk_item"+displayIndex).fadeIn(fadeTime);

		//set size of image
		var container = $("#display_area");
		var element = $("#weeosk_item"+displayIndex+" img.weeosk_image");
		if(element !== null)  {
		    var scaleDimension = (element.width()/element.height() > container.width()/container.height())?"width":"height";
		    element[scaleDimension]("90%");
		}
		//set position of item
		var element = $("#weeosk_item"+displayIndex);
		var top = .5*(container.height()-element.height());
		element.css({'position':'relative','top':top+'px'});

	    });
    }

    this.play();
}
/********** WeeoskController ******************/

/********** Weeosk ************/
function Weeosk(maxSize)  {
    var MAX_ITEMS = 10;
    var items = {};
    var indices = {};
    var itemTypeCount = 0;
    var current = null;
    var next = null;
    var ready = false;


    this.add = function(newItem)  {
	var type = newItem[0];
	var content = newItem[1]
	
	if(items[type] === undefined)  {
	    items[type] = [];
	    itemTypeCount = itemTypeCount+1;
	}
	items[type].unshift(content);
	indices[type] = 0;  //keep the freshest stuff showing up soonest

	if(!ready) ready = true;
	
	//current = items[type][0];  //set current to the first element
	//next = items[type][1%items[type].length];

	if(items[type].length > MAX_ITEMS)
	    items[type].pop();
    }

    this.currentItem = function()  {
	var rand = Math.floor(Math.random()*itemTypeCount);
	var randElement;
	var result;
	
	//pick a random type (e.g. twitter, flickr, etc)
	for(var i in items)  {
	    if(rand === 0)
		randElement = i;
	    rand--;
	}

	//result = current;
	//current = next;
	//$("#debug_area").html("displaying "+randElement+" "+indices[randElement]+" of "+items[randElement].length);
	result = items[randElement][indices[randElement]];
	indices[randElement]=(indices[randElement]+1)%items[randElement].length;

	return result;
    }

    this.ready = function() {
	return ready;
    }
}
/********** End Weeosk ************/



/********** SpotterControllers *****/
SpotterController = function(type, options, weeosk)  {
    var s = new spotter.Spotter(type,options);
    this.notify = function(data)  {
	for(var i=data.length-1; i >=0; i--)  {
	    var temp = this.markup(data[i]);
	    weeosk.add([type.split(".")[0],temp]);
	}
    }

    this.markup = function(item)  {
	throw new Error("markup not implemented in the generic SpotterController class");
    }

    this.destroy = function()  {
	s.stop();
    }

    s.register(this);
    s.spot();
}

TwitterController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(tweet)  {
	var result = "<div class='twitter'>" 
	+"<div class='text'>"+tweet.text+"</div>"
	+"<div class='user_id'>"+tweet.from_user+"</div>"
	+"<div class='profile_image'><img src='"+tweet.profile_image_url+"'></img></div>"
	+"</div>";
	return result;
    }
}


FlickrController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(photo)  { 
	var result = "<div class='flickr'>"
	+"<div  class='image'><img class='weeosk_image' src='"+photo.url+"'></img></div>"
	+"<div class='title'>"+photo.title+"</div>"
	+"</div>"
	return result;
    }
}

TwitpicController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(twitpic)  { 
	var result = "<div class='twitpic'>"
	+"<div class='profile_image'><img src='"+twitpic.profile_image_url+"'></img></div>"
	+"<div class='image'><img class='weeosk_image' src='"+twitpic.twitpic_full_url+"'></img></div>"
	+"<div class='text'>"+twitpic.text+"</div>"
	+"</div>"
	return result;
    }
}

/********** End SpotterControllers *****/
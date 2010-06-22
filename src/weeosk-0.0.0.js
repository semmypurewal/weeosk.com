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
    this.view = v;
}

WeeoskViewController.prototype.show = function()  {
    this.view.fadeIn(500);

    //create new weeosk controller with the current search term
    this.wc = new WeeoskController(this.searchTerm);
}

WeeoskViewController.prototype.hide = function()  {
    this.view.fadeOut(500);
   
    //destroy weeosk controller
    this.wc.destroy();
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
    var showRunning = false;
    var fadeTime = 500;
    var displayTime = 6000;
    var spotterControllers = [];

    spotterControllers.push(new TwitterController("twitter.search",{searchString:searchTerm,frequency:60},weeosk));
    spotterControllers.push(new FlickrController("flickr.search",{api_key:"867d7e82cd6b196e83e27d308d97a7f0",tags:searchTerm,frequency:60}, weeosk));
    spotterControllers.push(new TwitpicController("twitpic.search",{searchString:searchTerm, frequency:60},weeosk));

    this.destroy = function() {
	clearTimeout(timer);
	for(var i in spotterControllers)
	    spotterControllers[i].destroy();
	setTimeout(function() {$("#weeosk_item").html("") }, 1000);
    }

    this.play = function()  {
	showRunning = true;
	$("#weeosk_item").html();
	this.display();
	timer = setInterval(function() {
		that.display();
	    }, displayTime);
    }

    this.stop = function()  {
	timer = null;
    }

    this.display = function()  {
	$("#weeosk_item").fadeOut(fadeTime, function()  {
		$("#weeosk_item").html(weeosk.currentItem());
		$("#weeosk_item").fadeIn(fadeTime);
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
    var currentItem = null;
    var nextItem = null;

    this.add = function(newItem)  {
	if(items[newItem[0]] === undefined)  {
	    items[newItem[0]] = [];
	    itemTypeCount = itemTypeCount+1;
	}
	indices[newItem[0]] = 0;  //keep the freshest stuff showing up soonest
	items[newItem[0]].unshift(newItem[1]);
	if(items[newItem[0]].length > MAX_ITEMS)
	    items[newItem[0]].pop();

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
	result = items[randElement][indices[randElement]];
	indices[randElement]=(indices[randElement]+1)%items[randElement].length;
	return result;
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
	+"<div  class='image'><img src='"+photo.url+"'></img></div>"
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
	+"<div class='twitpic_image'><img class='image' src='"+twitpic.twitpic_full_url+"'></img></div>"
	+"<div class='text'>"+twitpic.text+"</div>"
	+"</div>"
	return result;
    }
}

/********** End SpotterControllers *****/
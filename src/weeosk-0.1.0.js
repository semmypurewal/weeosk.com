/**
 * TODO: create exclude:twitpic option in spotter twitter module
 * TODO: launch Weeosk Alpha 0.1.0
 * TODO: try to implement back button
 * TODO: add ads to second search and beyond (google ads?)
 */

function init()  {
    window.ac = new ApplicationController();
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
    var trendSpotter;
    this.view = v;
    document.getElementById("search_term_input").value = "";
    this.show();
    trendSpotter = new spotter.Spotter("twitter.trends",{frequency:0});
    trendSpotter.register(this);
    trendSpotter.spot();
}

SearchViewController.prototype.show = function()  {
    this.view.fadeIn(500);
}

SearchViewController.prototype.hide = function()  {
    this.view.fadeOut(500);    
}

SearchViewController.prototype.notify = function(data)  {
    var temp;
    $("#trends").append("<p id='trends1'>");
    for(t in data.trends.slice(0,5))  {
	if(t !== "4")
	    $("#trends1").append("<a class='trend' href='#' onclick='window.ac.go(\""+data.trends[t].name+"\");'>"+data.trends[t].name+"</a>, ");
	else
	    $("#trends1").append("<a class='trend' href='#' onclick='window.ac.go(\""+data.trends[t].name+"\");'>"+data.trends[t].name+"</a>");
    }

    $("#trends").append("<p id='trends2'>");
    var temp = data.trends.slice(5,10);
    for(t in temp)  {
	if(t !== "4")
	    $("#trends2").append("<a class='trend' href='#' onclick='window.ac.go(\""+temp[t].name+"\");'>"+temp[t].name+"</a>, ");
	else
	    $("#trends2").append("<a class='trend' href='#' onclick='window.ac.go(\""+temp[t].name+"\");'>"+temp[t].name+"</a>");
    }
    $("#trends").fadeIn("slow")
}
/********** End SearchViewController ***********/


/********** WeeoskViewController ***********/
function WeeoskViewController(v)  {
    var that = this;
    this.view = v;
    this.controlTimeout = null;

    v.mousemove( function() { that.showControls(); } );
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
    $("#controls").fadeIn();
    $("#weeosk_term").fadeIn();
    if(this.controlTimeout !== null) clearTimeout(this.controlTimeout);
    this.controlTimeout = setTimeout(function() { that.hideControls(); }, 2000);
}

WeeoskViewController.prototype.hideControls = function()  {
    //$("#weeosk_term").fadeTo(500,0);
    $("#controls").fadeOut();
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
    spotterControllers.push(new FlickrController("flickr.feeds",{tags:searchTerm,frequency:60}, weeosk));
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
     * process the timestamp
     * position/scale the currently buffered item
     * fade in the currently buffered item
     */
    this.display = function()  {
	$("#weeosk_item"+displayIndex).fadeOut(fadeTime, function()  {
		//increment the displayIndex
		displayIndex = (displayIndex+1)%2;
		
		//set the next buffered item
		$("#weeosk_item"+(displayIndex+1)%2).html(weeosk.currentItem());
		
		//process the timestamp (we have to do this here b/c it could be shown multiple times)
		//var temp = $("#weeosk_item"+displayIndex+" .timestamp").html();
		//alert(temp + " " + Date.parse(temp.match("(.*)T")[1]));
		var timestamp = new Date($("#weeosk_item"+displayIndex+" .timestamp").html());
		var now = new Date();
		var rel = relativeTime((now.getTime()-timestamp.getTime())/1000);
		if(rel !== "")  {
		    $("#weeosk_item"+displayIndex+" .relative_timestamp").html(rel);
		}
		else  {
		    $("#weeosk_item"+displayIndex+" .relative_timestamp").html(timestamp.toLocaleString());		    
		}

		//fade in the currently buffered item
		$("#weeosk_item"+displayIndex).fadeIn(fadeTime);

		//set size of image
		var container = $("#display_area");
		var element = $("#weeosk_item"+displayIndex+" img.weeosk_image");
		if(element.width() !== null)  {
		    var scaleDimension = (element.width()/element.height() > container.width()/container.height())?"width":"height";
		    var px = Math.ceil(container[scaleDimension]()*.80);
		    element[scaleDimension](px+"px");
		}
		//set position of item
		var element = $("#weeosk_item"+displayIndex);
		var top = .5*(container.height()-element.height());
		element.css({'position':'relative','top':top+'px'});

	    });
    }

    var relativeTime = function(seconds)  {
	var result;
	if(!seconds) {
	    result = "";
	}
	else if(seconds < 60)  {
	    result = "about " + Math.round(seconds) +" seconds ago";
	}
	else if(seconds < 3600)  {
	    result = "about " + Math.round(seconds/60) + " minutes ago";
	}
	else if(seconds < 86400)  {
	    result = "about " + Math.round(seconds/3600) + " hours ago";
	}
	else if(seconds < 604800)  {
	    result = Math.round(seconds/86400) + " days ago";
	}
	else if(seconds < 4233600)  {
	    result = Math.round(seconds/604800) + " weeks ago";
	}
	else  {
	    result = "";
	}

	result = result.replace(new RegExp("((\ |^)1 \\S*)s ","g"), "$1 ");

	return result;
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

    this.tweetLinkify = function(s) {
	s =  s.replace(new RegExp('(http\:\/\\S*)', 'g'),"<a target =\"_blank\" href=\"$1\">$1</a>");
	s = s.replace(new RegExp('(^|\ )@(\\S+)', 'g'), "<a target='_blank' href=\'http://www.twitter.com/$2\'>@$2</a>");
	return s;
    }
}

TwitterController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(tweet)  {
	var result = "<div class='twitter'>" 
	+"<div class='text'>"+this.tweetLinkify(tweet.text)+"</div>"
	+"<div class='user_id'><a target='_blank' href='http://www.twitter.com/"+tweet.from_user+"'>"
        +tweet.from_user+"</a> <span class='additional_info'><span class='relative_timestamp'></span> via&nbsp;<a target='_blank' href='http://www.twitter.com'>twitter</a></span></div>"
	+"<div class='profile_image'><img src='"+tweet.profile_image_url+"'></img></div>"
	+"<div class='timestamp' style='display:none'>"+tweet.created_at+"</div>"
	+"</div>";
	return result;
    }
}


FlickrController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(photo)  { 
	//damn you non-firefox browsers: need to contstruct a more universal date format
	var dateSplit = photo.published.split(new RegExp("[\-T\:Z]"));
	var timestamp = new Date(dateSplit[0],dateSplit[1]-1,dateSplit[2]-1,dateSplit[3],dateSplit[4],dateSplit[5]);

	var result = "<div class='flickr'>"
	+"<div  class='image'><a target='_blank' href='"+photo.photo_url+"'><img class='weeosk_image' src='"+photo.url+"'></a></img></div>"
	+"<div class='title'>"+photo.title+"</div>"
        +"<div class='user_id'><a target='_blank' href='"+photo.user_url+"'>"+photo.user_id+"</a> <span class='additional_info'><span class='relative_timestamp'></span>"
        +" via&nbsp;<a target='_blank' href='http://www.flickr.com'>flickr</a></span></div>"
	+"<div class='timestamp' style='display:none'>"+timestamp.toUTCString()+"</div>"
	+"</div>"
	return result;
    }
}

TwitpicController = function(type, options, weeosk)  {
    SpotterController.call(this, type, options, weeosk);
    this.markup = function(twitpic)  { 
	var url = twitpic.text.match(new RegExp('http://twitpic.com/\\S*','g'), '')[0];
	twitpic.text = twitpic.text.replace(url,'');
	var result = "<div class='twitpic'>"
	+"<div class='profile_image'><img src='"+twitpic.profile_image_url+"'></img></div>"
	+"<div class='image'><a target='_blank' href='"+url+"'><img class='weeosk_image' src='"+twitpic.twitpic_full_url+"'></img></a></div>"
	+"<div class='text'>"+this.tweetLinkify(twitpic.text)+"</div>"
	+"<div class='user_id'><a target='_blank' href='http://www.twitter.com/"+twitpic.from_user+"'>"+twitpic.from_user+"</a>"
	+" <span class='additional_info'><span class='relative_timestamp'></span> via&nbsp;<a target='_blank' href='http://www.twitpic.com'>twitpic</a></span></div>"
	+"<div class='timestamp' style='display:none'>"+twitpic.created_at+"</div>"
	+"</div>"
	return result;
    }
}

/********** End SpotterControllers *****/
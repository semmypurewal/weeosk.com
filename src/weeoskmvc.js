function init()  {
    window.ac = new ApplicationController();
}

/********** ApplicationController **********/
function ApplicationController()  {
    this.controllers = {};
}

ApplicationController.prototype.addController = function(c)  {
    this.controllers[] = c;
}


/********** End ApplicationController **********/


/********** SearchController ***********/
function SearchController()  {
}
/********** End SearchController *******/

/********** SearchView ****************/
function SearchView()  {
}
/********** End SearchView ************/


/********** WeeoskController **********/
function WeeoskController()  {
}
/********** End WeeoskController **********/

/********** WeeoskView ***********/
function WeeoskView()  {
}
/********** End WeeoskView ***********/

/********** Weeosk ************/
function Weeosk()  {
}
/********** End Weeosk ************/


/********** SpotterControllers *****/
/********** End SpotterControllers *****/
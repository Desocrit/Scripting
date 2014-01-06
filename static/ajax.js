var currentPage;
var lastPing;
var project;
var annotations = [];

/**
 * Should display the main interface (called after successful login)
 */
function displayMain(user) {}

/**
 * Should display an error on the login form
 */
function displayLoginError() {}

/**
 * This is called when the server responds with nonsense
 */
function displayServerError(xmlhttp)
{
    alert('Server be broken');
}

function displayAddPage()
{
    alert('Page added!');
}

/**
 * This is called with the server times out
 */
function displayTimeoutError()
{
    alert('Server be broken (timeout)');
}


function apiCall(command, vars, callback)
{
    var xmlhttp = window.XMLHttpRequest
        ? new XMLHttpRequest()
        : new ActiveXObject("Microsoft.XMLHTTP"); // IE <= 6
    
    xmlhttp.onreadystatechange = (function()
    {
        if (xmlhttp.readyState == 4)
        {
            if (xmlhttp.status == 200)
            {
                callback(xmlhttp.responseText);
            }
            else
            {
                displayServerError(xmlhttp);
            }
        }
    });

    var req =
          '/end?project_name='  + project
        + '&'              + vars
        + '&command='      + command
        + '&output_type=json';

    xmlhttp.timeout   = 3000;
    xmlhttp.ontimeout = displayTimeoutError;
    xmlhttp.open('GET', req, true);
    xmlhttp.send();
}

function jsonCall(command, vars, success, fail)
{
    apiCall
    (
        command,
        vars,
        (function(text)
        {
            var response;

            try
            {
                response = JSON.parse(text);
            }
            catch (e)
            {
                displayServerError();
            }
            
            if (response.status == 'success')
            {
                success(response);
            }
            else
            {
                fail(response);
            }
        })
    );
}

function login()
{
    var vars =
           'username=' + document.getElementById('username').value
        + '&password=' + document.getElementById('password').value;

    jsonCall('login', vars, displayMain, displayLoginError);
}

function getPage()
{
    document.getElementById('page_holder').src =
          '/end?command=View+Page'
        + '&url=' + encodeURIComponent(document.getElementById('go_button').value)
        + '&project_name=' + project;
}

function checkForUpdates()
{
    jsonCall
    (
        'edits', 'url=' + currentPage + '&since=' + lastPing,
        (function(edits)
        {
            for (var i in edits.edits)
            {
                if (i == 'length') continue;

                
            }
        })
    );
}

function buttonAddPage(url, projectName)
{
    url = url.replace(/:/g,'%3A');
    url = url.replace(/\//g,'%2F');
<<<<<<< HEAD
    project = projectName;
    jsonCall("Add+or+Replace+Page", "url="+url, displayAddPage, displayServerError);
=======
    jsonCall("Add+or+Replace+Page", "url="+url, displayAddPage, displayServerError);
    // Should then display some kind of "done!" message and refresh the pages sidebar
    // brb going to meeting
>>>>>>> 2f344b90075f40fb5d3b3c9b650ce1a6b9438426
}

/*
function addAnnotation(msg, id, x, y)
{
	{
		jsonCall
		(
			'annotate',
            'message=' + msg + '&element_id=' + id + '&x_pos=' + x + 'y_pos=' + y,
		);
	}
}
*/

function listPages(projectName)
{
	document.getElementById('navigation').innerHTML = 
	    '/end?command=page_links'
        + '&project_name=' + project;
}

function saveAnnotations()
{
    for (var i = 0; i < annotations.length; i++)
    {
        jsonCall
        (
              'Annotate',
              'message=' + annotations[i].innerText
            + '&id=' + annotations[i].subjectElement.id
            + '&x_pos=m&y_pos=n',
            (function() { }),
            displayServerError
        );
    }
}
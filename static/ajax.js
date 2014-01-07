var currentPage;
var lastPing;
var project = 'default_project';
var annotations = [];
var callback;

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
    // Need to update pages list
    alert('Page added!');
}

function displayCreatePage()
{
    // Need to update pages list
    alert('Project created!');
}

/**
 * This is called with the server times out
 */
function displayTimeoutError()
{
    alert('Server be broken (timeout)');
}

function displayPageNotFound()
{
    alert('Page not found');
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

function getPage(url)
{
    var frame = document.getElementById('page_holder');
    
    frame.src =
          '/end?command=View+Page'
        + '&url=' + encodeURIComponent(url)
        + '&project_name=' + project;

    currentPage = url;

    frame.onload = (function()
    {
        var doc = frame.contentWindow.document;
        var s   = doc.createElement('script');
        s.src = '/static/inject.js';
        doc.head.appendChild(s);
    });
}

function createProject(){
    var newName = prompt('Enter new project name:');
    if(newName){
        project = newName;
        jsonCall("Create+Project",null,displayCreatePage, displayServerError);
        jsonCall("Switch+Project",null,function(){},displayServerError);
    } else {
        alert('Project name required.');
    }
}

function switchProject(){
    
}

function deleteProject(){
    
}

function buttonAddPage()
{
    var url = document.getElementById('search').value;

    jsonCall
    (
        "Add+or+Replace+Page",
        "url="+url,
        (function(){getPage(url);}),
        displayPageNotFound
    );
}

function listPages(projectName)
{
	document.getElementById('navigation').innerHTML = 
	    '/end?command=page_links'
        + '&project_name=' + project;

    var links = document.getElementById('links');
    links.innerHTML = '';

    jsonCall
    (
        'page_links', '',
        (function(response)
        {
            for (var i = 0; i < response.pages.length; i++)
            {
                var url = response.pages[i].url;

                links.innerHTML += '<li><a href="' + url + '">' + url + '</a></li>';
            }
        }),
        displayServerError
    );
}

function saveAnnotations()
{
    for (var i = 0; i < annotations.length; i++)
    {
        jsonCall
        (
              'Annotate',
              'message=' + annotations[i].innerText
            + '&url=' + encodeURIComponent(currentPage)
            + '&element_id=' + annotations[i].subjectElement.id
            + '&x_pos=1&y_pos=1',
            (function() { }),
            displayServerError
        );
    }
}

function pingForAnnotations()
{
    for (var i = 0; i < annotations.length; i++)
    {
        jsonCall
        (
            'get_annotations',
            'url=' + encodeURIComponent(currentPage),
            (function(response)
            {
                for (var i = 0; i < response.SOMETHING.length; i++)
                {
                    callback
                    (
                        response.SOMETHING[i].x_pos,
                        response.SOMETHING[i].y_pos,
                        response.SOMETHING[i].element_id,
                        response.SOMETHING[i].message
                    )
                }
            }),
            displayServerError
        );
    }
}


function setCallback(cb)
{
    callback = cb;
}
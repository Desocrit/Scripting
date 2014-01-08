var currentPage;
var lastPing;
var project = 'default_project';
var annotations = { };
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
    xmlhttp.timeout   = 6000;
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

function logout() {

    jsonCall(
        "logout", '', function() {

        }, displayServerError);
}

function getPage(url)
{
    var frame = document.getElementById('page_holder');
    
    annotations = { };

    frame.src =
          '/end?command=View+Page'
        + '&url=' + encodeURIComponent(url)
        + '&project_name=' + project;

    currentPage = url;
    document.getElementById('search').value = url;

    frame.onload = (function()
    {
        var doc = frame.contentWindow.document;
        var s   = doc.createElement('script');
        s.src = '/static/inject.js';

        var jq  = doc.createElement('script');
        jq.src = 'http://code.jquery.com/jquery-1.10.1.min.js';
        jq.async = false;

        var jui  = doc.createElement('script');
        jui.src = 'http://code.jquery.com/ui/1.10.3/jquery-ui.js';
        jui.async = false;

        var c = doc.createElement('link');
        c.rel="stylesheet" ;
        c.href="/static/inject.css" ;
        c.type="text/css";

        var ui = doc.createElement('link');
        ui.rel="stylesheet" ;
        ui.href="http://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css" ;
        ui.type="text/css";

        
                doc.head.appendChild(ui);

        doc.head.appendChild(c);
        doc.head.appendChild(jq);
        doc.head.appendChild(jui);

        doc.head.appendChild(s);

        
    });

    listPages();
}

function createProject(){
    var newName = prompt('Enter new project name:');
    if(newName){
        project = newName;
        jsonCall("Create+Project",null,displayCreatePage, displayServerError);
    } else {
        alert('Project name required.');
    }
}

function switchProject(project_name){
    project = project_name;
    listPages();
}

function deleteProject(){
    var project_name = project;
    var confirm_delete = confirm("Are you sure you want to delete project " + project_name + "?");
    if(confirm_delete) {
        switchProject(project_name);
        jsonCall("Delete+Project",null,displayCreatePage, displayServerError);
        switchProject("default_project");
    }
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

function listPages()
{
    var links = document.getElementById('links');

    jsonCall
    (
        '', '',
        (function(response)
        {
            links.innerHTML = '';
            for (var i = 0; i < response.pages.length; i++)
            {
                var url = response.pages[i].url;

                links.innerHTML += '<li onclick="getPage(\'' + url + '\')">' + url + '</li>';
            }
        }),
        displayServerError
    );
}

function saveAnnotations()
{
    for (var i in annotations)
    {
        jsonCall
        (
              'Annotate',
              'message=' + annotations[i].innerText
            + '&url=' + encodeURIComponent(currentPage)
            + '&element_id=' + annotations[i].subjectElement.id
            + '&uniqid=' + annotations[i].uniqid
            + '&x_pos=' + parseInt(annotations[i].style.left)
            + '&y_pos=' + parseInt(annotations[i].style.top),
            (function() { }),
            displayServerError
        );
    }
}

function pingForAnnotations()
{
    jsonCall
    (
        'get_annotations',
        'url=' + encodeURIComponent(currentPage),
        (function(response)
        {
            for (var i = 0; i < response.annotations.length; i++)
            {
                if (typeof annotations[response.annotations[i].uniqid] == 'undefined')
                {
                    callback
                    (
                        response.annotations[i].x_pos,
                        response.annotations[i].y_pos,
                        response.annotations[i].element_id,
                        response.annotations[i].contents
                    );
                }
                else
                {
                    var anot                 = annotations[response.annotations[i].uniqid];
                    anot.contentEl.innerText = response.annotations[i].contents;
                    anot.style.left          = response.annotations[i].x_pos + 'px';
                    anot.style.top           = response.annotations[i].y_pos + 'px';
                }
            }
        }),
        displayServerError
    );
}

function ping()
{
    saveAnnotations();
    pingForAnnotations();
    listPages();

    window.setTimeout(ping, 5000);
}


function setCallback(cb)
{
    callback = cb;
}

function writeUsername()
{
    var nameText = document.getElementById('usn');
    nameText.innerHTML = '';

    jsonCall
    (
        'get user', null,
        (function(response)
        {
            nameText.innerHTML = response.username;
        }),
        function(){}
    );
}

$(document).ready(function()
{
    ping();
});
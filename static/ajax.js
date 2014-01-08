var currentPage;
var lastPing;
var project = 'default_project';
var annotations = { };
var callback = null;
var userName;
var lastResponse;
var error = [ ];
var projects = [ ];

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
}

function displayAddPage()
{
}

function displayCreatePage()
{
}

/**
 * This is called with the server times out
 */
function displayTimeoutError()
{
}

function displayPageNotFound()
{
}

function err(msg, command, raw, e)
{
    console.log(msg + '. Command: ' + command + '. See error[' + error.length + ']');
    error.push({"data" : raw, "exception" : e});
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
                try
                {
                    callback(xmlhttp.responseText);
                }
                catch (e)
                {
                    err('Failed', command, lastResponse, e);
                }
            }
            else
            {
                err('Server Error', command, lastResponse, null);
            }
        }
    });

    try
    {
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
    catch (e)
    {
        err('Server Error', command, lastResponse, null);
    }
}

function jsonCall(command, vars, success, fail)
{
    apiCall
    (
        command,
        vars,
        (function(text)
        {
            try
            {
                lastResponse = JSON.parse(text);
            }
            catch (e)
            {
                err('Not JSON', command, lastResponse, e);
            }
            
            if (lastResponse.status == 'success')
            {
                success(lastResponse);
            }
            else
            {
                fail(lastResponse);
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
    callback    = null;

    frame.src =
          '/end?command=View+Page'
        + '&url=' + encodeURIComponent(url)
        + '&project_name=' + project;

    currentPage = url;
    document.getElementById('search').value = url;

    frame.onload = (function()
    {
        var doc = frame.contentWindow.document;

        var jq  = doc.createElement('script');
        jq.src = 'http://code.jquery.com/jquery-1.10.1.min.js';
        jq.async = false;

        var jui  = doc.createElement('script');
        jui.src = 'http://code.jquery.com/ui/1.10.3/jquery-ui.js';
        jui.async = false;

        var s     = doc.createElement('script');
        s.src     = '/static/inject.js';
        s.async = false;

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

        pingForAnnotations();
        
    });

    listPages();
}

function createProject(){
    var newName = prompt('Enter new project name:');
    if(newName){
        project = newName;
        jsonCall("Create+Project",null,displayCreatePage, displayServerError);
        listProjects();
        switchProject(newName);
        alert("project" + newName + " created!")
    } else {
        alert('Project name required.');
    }
}

function switchProject(project_name){
    project = project_name;
    document.getElementById('project_name_el').innerHTML = project_name;
    listPages();
}

function deleteProject(){
    var project_name = project;
    var confirm_delete = confirm("Are you sure you want to delete project " + project_name + "?");

    if(confirm_delete)
    {
        if(projects.length == 1)
        {
            alert("Sorry you can't delete your only project, make another one first!");
        }
        else
        {
            jsonCall("Delete+Project",null,displayCreatePage, displayServerError);
            var newProject;
            
            for (var i = 0; i < projects.length; i++)
            {
                if (projects[i] != project_name)
                {
                    newProject = projects[i];
                    break;
                }
            }

            alert("Project " + project_name + " deleted. Switched to " + newProject);
            switchProject(newProject);
            listProjects();
        }
    }
}

function buttonAddPage()
{
    var url = document.getElementById('search').value;

    jsonCall
    (
        "Add+or+Replace+Page",
        "url="+ encodeURIComponent(url),
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
              'message=' + annotations[i].contentEl.value
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

function saveAnnotation()
{
    var anot = this.wrapper;

    jsonCall
    (
          'Annotate',
          'message=' + anot.contentEl.value
        + '&url=' + encodeURIComponent(currentPage)
        + '&element_id=' + anot.subjectElement.id
        + '&uniqid=' + anot.uniqid
        + '&x_pos=' + parseInt(anot.style.left)
        + '&y_pos=' + parseInt(anot.style.top),
        (function() { }),
        displayServerError
    );
}

function pingForAnnotations()
{
    if (!currentPage) return;
    
    jsonCall
    (
        'get_annotations',
        'url=' + encodeURIComponent(currentPage),
        (function(response)
        {
            var load = (function()
            {
                if (!callback)
                {
                    window.setTimeout(load, 200);
                }
                else
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
                                response.annotations[i].contents,
                                response.annotations[i].uniqid
                            );
                        }
                        else
                        {
                            var anot             = annotations[response.annotations[i].uniqid];
                            anot.contentEl.value = response.annotations[i].contents;
                            anot.style.left      = response.annotations[i].x_pos + 'px';
                            anot.style.top       = response.annotations[i].y_pos + 'px';
                        }
                    }
                }
            });
            load();
        }),
        displayServerError
    );
}

function ping()
{

    //try { saveAnnotations(); } catch (e){}
    try { pingForAnnotations();  } catch (e){}
    try { listPages();  } catch (e){}
    try { listProjects();  } catch (e){} // Commented out - SERVER BROKEN

    window.setTimeout(ping, 5000);
}

function listProjects(switchToFirst) {

    var projects_list = document.getElementById('project_list');
    jsonCall
    (
        'list projects', '',
        (function(response)
        {
            projects_list.innerHTML = '';
            projects = [ ];
            
            if (response.admin_access.length > 0)    projects_list.innerHTML += '<li><b>Admin Access</b></li>';
            for (var i = 0; i < response.admin_access.length; i++)
            {
                var project = response.admin_access[i];
                projects.push(project);
                projects_list.innerHTML += '<li onclick="switchProject(\'' + project + '\')">' + project + '</li>';
            }

            var normals = [ ];
            for (var i = 0; i < response.normal_access.length; i++)
            {
                var project = response.normal_access[i];

                if (response.admin_access.indexOf(project) == -1)
                {
                    normals.push(project);
                }
            }
            
            if (normals.length > 0)   projects_list.innerHTML += '<li><b>Member Access</b></li>';
            for (var i = 0; i < normals; i++)
            {
                var project = normals[i];

                projects.push(project);

                projects_list.innerHTML += '<li onclick="switchProject(\'' + project + '\')">' + project + '</li>';
            }

            if (switchToFirst)
            {
                switchProject(projects[0]);
            }
        }),
        displayServerError
    );
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

function tempView(url){
    jsonCall
    (
        'temp view', 'url=' + url,
        (function(){}),
        function(){}
    );    
}

$(document).ready(function()
{
    ping();
});



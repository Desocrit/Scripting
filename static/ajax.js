var currentPage;
var lastPing;
var project = null;
var annotations = { };
var callback = null;
var userName;
var lastResponse;
var error = [ ];
var projects = [ ];
var pages = [ ];

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

    function login_url() {
        jsonCall(
            "login", "", function(response) {
                document.getElementById("login_link").href = response.login_url;
            }, displayServerError)
    }

    function login()
    {
        $("#front_page").animate({opacity: 0.0}).css({top: "-120%"}, 500);
        $("#container").css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1.0}, 500);
        $("header").animate({top: '0'}, 500);
        $("footer").animate({bottom: '0'}, 500);
    }

    function logout_url() {
      var logoutLinkUpdater = function(response) {
        document.getElementById("logout_link").href = response.logout_url;
    };
    jsonCall("logout", "", logoutLinkUpdater, logoutLinkUpdater);
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

        /*
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
        */

        //pingForAnnotations();
        
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

    if(projects.length == 1)
    {
        alert("Sorry you can't delete your only project, make another one first!");
    }
    else
    {
        if(confirm("Are you sure you want to delete project " + project_name + "?"))
        {
           
            jsonCall("Delete+Project",null,displayCreatePage, displayServerError);
            var newProject;
            
            for (var i = 0; i < projects.length; i++)
            {
                if (projects[i].name != project_name)
                {
                    newProject = projects[i].name;
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

function buttonDeletePage()
{
    jsonCall
    (
        "Delete+Page",
        "url="+ encodeURIComponent(currentPage),
        (function()
        {
            var newPage;
            for (var i = 0; i < pages.length; i++)
            {
                if (pages[i] != currentPage)
                {
                    newPage = pages[i];
                    break;
                }
            }

            listPages();
            getPage(newPage ? newPage : 'http://www.wikipedia.com/');
        }),
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
            pages           = [ ];

            for (var i = 0; i < response.pages.length; i++)
            {
                var url = response.pages[i].url;

                pages.push(url);
                links.innerHTML += '<li onclick="getPage(\'' + url + '\')">' + url + '</li>';
            }
        }),
        displayServerError
        );
}

function saveAnnotation(e)
{
    if (this.wrapper)
    {
        var anot = this.wrapper;
    }
    else
    {
        var anot = this;
    }

    jsonCall
    (
          'Annotate',
          'message=' + anot.contentEl.value
        + '&url=' + encodeURIComponent(currentPage)
        + '&element_id=' + anot.subjectElement.id
        + '&uniqid=' + anot.uniqid
        + '&x_pos=' + (parseInt(anot.style.left) - getOffset(anot.subjectElement, 'Left'))
        + '&y_pos=' + (parseInt(anot.style.top) - getOffset(anot.subjectElement, 'Top')),
        (function() { }),
        displayServerError
    );

    anot.inEdit = false;
}

function getAnnotations()
{
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
                                parseInt(response.annotations[i].x_pos),
                                parseInt(response.annotations[i].y_pos),
                                response.annotations[i].element_id,
                                response.annotations[i].contents,
                                response.annotations[i].uniqid
                            );
                        }
                        else
                        {
                            var anot = annotations[response.annotations[i].uniqid];

                            if (!anot.inEdit)
                            {
                                anot.contentEl.value = response.annotations[i].contents;
                                anot.relativeCoords  =
                                {
                                    "x" : parseInt(response.annotations[i].x_pos),
                                    "y" : parseInt(response.annotations[i].y_pos)
                                };

                                anot.resize();
                            }
                        }
                    }
                }
            });
            load();
        }),
        displayServerError
    );
}

function pingForAnnotations()
{
    getAnnotations();

    window.setTimeout(pingForAnnotations, 3000);
}

function generalPing()
{
    listPages();
    listProjects();

    window.setTimeout(generalPing, 10000);
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
                projects.push({ "name" : project, "level" : "admin" });

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

                projects.push({ "name" : project, "level" : "user" });

                projects_list.innerHTML += '<li onclick="switchProject(\'' + project + '\')">' + project + '</li>';
            }

            if (switchToFirst)
            {
                switchProject(projects[0].name);
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
        function(){},
        (function(response)
        {
            nameText.innerHTML = response.username;
        })
        );
}

$(document).ready(function()
{
    generalPing();
    pingForAnnotations();
});

function getOffset (element, type)
{
    var offset = 0;
    while (element.offsetParent)
    {
        offset += element['offset' + type];
        element = element.offsetParent;
    }

    return offset;
}

function pageChanged(url, real)
{
    currentPage = url;
    document.getElementById('search').value = url;

    if (real)
    {
        getAnnotations();
    }
}
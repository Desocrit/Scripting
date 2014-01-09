/**
 * ajax.js
 *
 * Main JS file for the project
 *
 * Mainly handles translating js tasks into api calls. Also keeps track
 * of annotations, pages and projects
 */

/**
 * The page we are currently viewing
 */
var currentPage;

/**
 * @depreciated
 */
var lastPing;

/**
 * The current project
 */
var project = null;

/**
 * Set of annotations for the current page
 */
var annotations = { };

/**
 * Callback function to addAnnotation() within the iframe
 *
 * @see inject.js:addAnnotation()
 */
var callback = null;

/**
 * The logged in user's email address (used as a user name)
 */
var userName;

/**
 * The last response given by the server. Used to track timeouts
 */
var lastResponse;

/**
 * Error of network errors
 */
var error = [ ];

/**
 * Array of projects the user has access to, mapped with their access
 * level:
 *   { "name" : project_name, "level" : access_level }
 */
var projects = [ ];

/**
 * List of pages in the current project
 */
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

/**
 * Prints out and logs network errs
 */
function err(msg, command, raw, e)
{
    console.log(msg + '. Command: ' + command + '. See error[' + error.length + ']');
    error.push({"data" : raw, "exception" : e});
}


/**
 * Does a call to the server
 *
 * @param command  The command to execute
 * @param vars     NVPs of paramenters for the command
 * @param callback The function to call when a 200 response is recieved
 */
function apiCall(command, vars, callback)
{
    var xmlhttp = window.XMLHttpRequest
        ? new XMLHttpRequest()
        : new ActiveXObject("Microsoft.XMLHTTP");

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
        // Build the request path
        var req =
              '/end?project_name='  + project
            + '&'              + vars
            + '&command='      + command
            + '&output_type=json';

        xmlhttp.timeout   = 6000; // GAE is slow sometimes
        xmlhttp.ontimeout = displayTimeoutError;
        xmlhttp.open('GET', req, true);
        xmlhttp.send();
    }
    catch (e)
    {
        err('Server Error', command, lastResponse, null);
    }
}

/**
 * Wraps an apiCall by parsing the response as JSON
 *
 * @param command  The command to execute
 * @param vars     NVPs of paramenters for the command
 * @param success  The callback if status == 'success'
 * @param fail     The callback is status != 'success'
 */
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

/**
 * Gets the login url from the server and writes it to the login button
 */
function login_url()
{
    jsonCall
    (
        "login", "",
        function(response)
        {
            document.getElementById("login_link").href = response.login_url;
        },
        displayServerError
    );
}

/**
 * Opens up the page after the user has logged in
 */
function login()
{
    $("#front_page").animate({opacity: 0.0}).css({top: "-120%"}, 500);
    $("#container").css({opacity: 0.0, visibility: "visible"}).animate({opacity: 1.0}, 500);
    $("header").animate({top: '0'}, 500);
    $("footer").animate({bottom: '0'}, 500);
}

/**
 * Gets the logout url from the server and writes it to the logout button
 */
function logout_url()
{
    var logoutLinkUpdater = function(response)
    {
        document.getElementById("logout_link").href = response.logout_url;
    };

    jsonCall("logout", "", logoutLinkUpdater, logoutLinkUpdater);
}

/**
 * Gets a page and loads it into the iframe
 *
 * @param url The page to load
 */
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
}

/**
 * Creates a project
 */
function createProject()
{
    var newName = prompt('Enter new project name:');

    if(newName)
    {
        project = newName;
        jsonCall("Create+Project",null,displayCreatePage, displayServerError);
        listProjects();
        switchProject(newName);
        alert("project" + newName + " created!")
    }
    else
    {
        alert('Project name required.');
    }
}

/**
 * Switches to the given project and loads its first page
 *
 * @param project_name The project to load
 */
function switchProject(project_name)
{
    project = project_name;
    document.getElementById('project_name_el').innerHTML = project_name;
    listPages(true);

    for (var i in projects)
    {
        if (projects[i].name == project)
        {
            document.getElementById('admin_tasks').style.display =
                projects[i].level == 'admin'
                  ? ''
                  : 'none';
        }
    }
}

/**
 * Deletes the current project (it will switch to another of your
 * projects afterwards)
 */
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

/**
 * Adds the current page
 */
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

/**
 * Deletes the current page
 */
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

/**
 * Adds a user to the current project
 *
 * @param type "add admin" / "add user"
 */
function addUser(type)
{
    var name = prompt('Enter new user name:')
    if (name)
    {
        jsonCall
        (
            type, 'user_name=' + name,
            (function(){ alert(name + ' has been added to ' + project); }),
            (function(response) { alert(response.status); })
        );
    }
}

/**
 * Lists the pages of the current project
 *
 * @param switchToFirst If true, it'll load the first page
 */
function listPages(switchToFirst)
{
    var links = document.getElementById('links');

    jsonCall
    (
        '', '',
        (function(response)
        {
            links.innerHTML = '';
            pages           = [ ];

            if (switchToFirst && response.pages.length)
            {
                getPage(response.pages[0].url);
            }

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

/**
 * Event to save an annotation
 *
 * Called when lost focus / dragging has stopped
 */
function saveAnnotation(e)
{
    // This can be an event in more than one way with more than one
    // object
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

/**
 * Loads all annotations for the current page
 */
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
                // We need the frame to have finished loading before
                // doing this
                if (!callback)
                {
                    window.setTimeout(load, 200);
                }
                else
                {
                    for (var i = 0; i < response.annotations.length; i++)
                    {
                        // Is this annotation currently on the page?
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

/**
 * Pinds the server every 3 seconds for annotations
 */
function pingForAnnotations()
{
    getAnnotations();

    window.setTimeout(pingForAnnotations, 3000);
}

/** 
 * Refreshes the page / project list every 10 seconds
 */
function generalPing()
{
    listPages();
    listProjects();

    window.setTimeout(generalPing, 10000);
}

/**
 * Sets off the pings
 *
 * @see generalPing()
 * @see pingForAnnotations()
 */
$(document).ready(function()
{
    generalPing();
    pingForAnnotations();
});

/**
 * Adds the user's list of objects to the dropdown menu
 *
 * @param swithToFirst If true, it'll switch to the first one
 */
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

            // Pre load the normal access layers
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
            for (var i = 0; i < normals.length; i++)
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

/** 
 * Called by inject.js (from the iframe) to a) tell this window it's
 * ready and b) give it a way to pass updates to it
 *
 * @param cb The function to update annotations
 */
function setCallback(cb)
{
    callback = cb;
}

/**
 * Called by the iframe when the page is changed to update the search
 * url bar
 *
 * (If this is a page the project has saved, it will also grab its
 * annotations)
 *
 * @param url  The url that was loaded
 * @param real Is this a saved page?
 */
function pageChanged(url, real)
{
    currentPage = url;
    document.getElementById('search').value = url;

    if (real)
    {
        getAnnotations();
    }
}

/**
 * Gets the current user from the server and writes it to the username
 * element
 */
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

/**
 * Calculates the absolute left / top positions for a given element
 *
 * @param element The element to test
 * @param test    "Left" / "Top"
 */
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

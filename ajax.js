var currentPage;
var lastPing;

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

/**
 * This is called with the server times out
 */
function displayTimeoutError()
{
    alert('Server be broken (timeout)');
}


function apiCall(method, vars, callback)
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

    var req = method + '?' + vars;

    xmlhttp.timeout   = 3000;
    xmlhttp.ontimeout = displayTimeoutError;
    xmlhttp.open('GET', req, true);
    xmlhttp.send();
}

function jsonCall(method, vars, success, fail)
{
    apiCall
    (
        method,
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
    apiCall
    (
        'page', 'url=' + url,
        (function(text)
        {
            document.getElementById('main_area').innerHTML = text;
        })
    );
}

function checkForUpdates()
{
    jsonCall
    (
        'edits', 'url=' + currentPage '&since=' + lastPing,
        (function(edits)
        {
            for (var i in edits.edits)
            {
                if (i == 'length') continue;

                
            }
        })
    );
}


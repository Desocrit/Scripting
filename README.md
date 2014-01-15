Collaborowse
============

Simple 'get' server. Responses are in either json or html

To use, simply 'get' with any of the following options:

Login
-----

`command=login&redirect_url=whatever`

Logs in. Logs out if already logged in, then tries to login.
Redirects to redirect_url if provided, otherwise the current
project's main page.

Logout
------

`command=logout&redirect_url=whatever`

Logs out if logged in
Same redirect as above.

Smart Login
-----------
*Deprecated*

`command=smart_login&redirect_url=whatever`

Logs out if logged in. Logs in if logged out. See above for redirect.

Get User
---------

`command=get_user`

Returns json with `{"username": "usn", "status": "success"}` if logged in.
or `{"status": "Not logged in"}`, if not.

Temp View
---------

`command=temp view&url=something`
Gets the url requested for temporary viewing only.

Grab Temp Page
--------------
*Unused*

`command=grab temp page`

Gets the most recently 'temp view'ed page, and adds to the project.

List Projects
-------------

`command=list projects`
Lists projects the current user has admin or member access to.

Delete All
----------
*Unused*

`command=delete all&project_name=x`

Deletes all current pages in the project. Requires admin

List Users
----------

`command=list users&project_name=x`

Lists all users in the current project level, split by access level.

Project
-------
*No command for this*

`project_name=x`

View the api for a given project.

Create Project
--------------

`project_name=x&command=Create Project`

Creates a new project with the given name. Creator will
be added to users list and given admin rights.

Switch Project
--------------
*Unused*

`project_name=x&command=Switch Project`

Swtiches to the given project. Only needed for the API.

Delete Project
--------------

`project_name=x&command=Delete Project`

Deletes a project. Requires admin rights.

Make Public
-----------
*Unused*

`project_name=x&command=Make Public`

Makes a project public, i.e. anyone can access it.

Make Private
------------
*Unused*

`project_name=x&command=Make Private`

Makes a project public, i.e. permission is needed to access it.

Add Access
----------

`project_name=x&user_name=y&command=Add Access`
Grants 'view' access to the project.

Removed Access
--------------
*Unused*

`project_name=x&user_name=y&command=Remove Access`

Revokes 'view' access to the project.

Add Admin
---------

`project_name=x&user_name=y&command=Add Admin`

Grants admin privelidges to the project.

Remove Admin
------------
*Unused*

`project_name=x&user_name=y&command=Remove Admin`

Revokes admin privelidges to the project.

Add or Replace Page
-------------------

`project_name=x&url=y&command=Add or Replace Page`

Adds a page to the project. Alternatively, if the page already exists,
it will be replaced with the latest live version, and all comments
 will be deleted.
 
Update Page
-----------
*Unused*

`project_name=x&url=y&command=Update Page`

Updates the page to the latest live version. Comments will be kept 'as-is'.
This may cause some errrors. If the page is not in the project,
it will be added.

Page Details
------------
*Deprecated*

`project_name=x&url=y&command=Page Details`

Gives full details of the page, including url, and creator, 
as well as details of every version uploaded, all annotations for
each version and versions of each annotation. Currently only works
for JSON.

Roll Back Page
--------------
*Unused*

`project_name=x&url=y&command=Roll Back Page`

Deletes the latest version of a page. Admin privelidges required.
If only one version is stored, this will throw an error

View Page
---------

`project_name=x&url=y&command=View Page`

Views the saved html for a page.

Delete Page
-----------

`project_name=x&url=y&command=Delete Page`

Removed a page from the project

Annotate
--------

`project_name=x&url=y&command=Annotate&Message=z&x_pos=m&y_pos=n`

Creates an annotation on the given page. Message, x position,
and y position are all saved, for access via Page Details.

Get Annotations
---------------

`project_name=x&url=x&command=Get Annotations&output_type=json`

Gets a list of annotations only.

Get Page Links
--------------

`project_name=x&url=x&command=Get page links`

Gets a list of page links only.

Output Types
------------

`output_type=html` and `output_type=json`

Determines the type of output provided.

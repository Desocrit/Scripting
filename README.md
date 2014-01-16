Collaborowse
============

Simple 'get' server. Responses are in either json or html

To use, simply 'get' with any of the following options:

Login Commands
---------------

*The following commands handle user logins and will work with / without
being logged in*

<table>
  <tr><th>Command</th><th>Description</th></tr>
  <tr>
    <td>login</td>
    <td>
      Logs in. Logs out if already logged in, then tries to login.
      Redirects to redirect_url if provided, otherwise the current
      project's main page.
    </td>
  </tr>
  <tr>
    <td>logout</td>
    <td>
      Logs out if logged in
    </td>
  </tr>
  <tr>
    <td>
      smart_login
      **Depricated**
    </td>
    <td>
      Logs out if logged in. Logs in if logged out.
    </td>
  </tr>
  <tr>
    <td>get_user</td>
    <td>
      Returns json with `{"username": "usn", "status": "success"}` if
      logged in or `{"status": "Not logged in"}`, if not.
    </td>
  </tr>
</table>

Project Tasks
-------------

*The following commands deal with project-level tasks, and all require
`project_name=<project_name>` to be set, with the exception of
`list_projects`*

<table>
  <tr><th>Command</th><th>Description</th></tr>
  <tr>
    <td>list_projects</td>
    <td>
      Lists projects the current user has admin or member access to.
      Does **not require** `project_name=<project_name>`
    </td>
  </tr>
  <tr>
    <td>delete_all</td>
    <td>
      Deletes all current pages in the project. Requires admin
    </td>
  </tr>
  <tr>
    <td>list_users</td>
    <td>
      Lists all users in the current project level, split by access
      level.
    </td>
  </tr>
  <tr>
    <td>create_project</td>
    <td>
      Creates a new project with the given name. Creator will
      be added to users list and given admin rights.
    </td>
  </tr>
  <tr>
    <td>delete_projects</td>
    <td>Deletes a project. Requires admin rights.</td>
  </tr>
  <tr>
    <td>make_public</td>
    <td>Makes a project public, i.e. anyone can access it.</td>
  </tr>
  <tr>
    <td>make_private</td>
    <td>
      Makes a project public, i.e. permission is needed to access it.
    </td>
  </tr>
</table>

User Access Commands
--------------------

These commands grant / revoke privilages to users

They all require a `project_name` and a `user_name`

<table>
  <tr><th>Command</th><th>Description</th></tr>
  <tr>
    <td>add_access</td>
    <td>Grants 'view' access to the project.</td>
  </tr>
  <tr>
    <td>remove_access</td>
    <td>Revokes 'view' access to the project.</td>
  </tr>
  <tr>
    <td>add_admin</td>
    <td>Grants admin privelidges to the project.</td>
  </tr>
  <tr>
    <td>remove_access</td>
    <td>Revokes admin privelidges to the project.</td>
  </tr>
</table>

Page Commands
-------------

These deal with pages. They each require a `project_name` and `url`

<table>
  <tr><th>Command</th><th>Description</th></tr>
  <tr>
    <td>add_or_replace_page</td>
    <td>
      Adds a page to the project. Alternatively, if the page already exists,
      it will be replaced with the latest live version, and all comments
      will be deleted.
    </td>
  </tr>
  <tr>
    <td>update_page</td>
    <td>
      Updates the page to the latest live version. Comments will be kept 'as-is'.
      This may cause some errrors. If the page is not in the project,
      it will be added.
    </td>
  </tr>
  <tr>
    <td>page_details</td>
    <td>
      Gives full details of the page, including url, and creator, 
      as well as details of every version uploaded, all annotations for
      each version and versions of each annotation. Currently only works
      for JSON.
    </td>
  </tr>
  <tr>
    <td>roll_back_page</td>
    <td>
      Deletes the latest version of a page. Admin privelidges required.
      If only one version is stored, this will throw an error
    </td>
  </tr>
  <tr>
    <td>view_page</td>
    <td>Views the saved html for a page.</td>
  </tr>
  <tr>
    <td>delete_page</td>
    <td>Removes a page from the project</td>
  </tr>
  <tr>
    <td>annotate</td>
    <td>
      Creates an annotation on the given page. Message, x position,
      and y position are all saved, for access via Page Details.
      
      Also requires:
      * `Message`
      * `x_pos`
      * `y_pos`
      * `element_id`
      * `uniqid`
    </td>
  </tr>
  <tr>
    <td>get_annotations</td>
    <td>Gets a list of annotations only.</td>
  </tr>
  <tr>
    <td>temp_view</td>
    <td>Gets the url requested for temporary viewing only.</td>
  </tr>
  <tr>
    <td>grab_temp_page</td>
    <td>Gets the most recently 'temp view'ed page, and adds to the project.</td>
  </tr>
</table>

API Commands
-------

These are only required for the 'admin' pages:
  * `project_name=x` - View the api for a given project.
  * `project_name=x&command=Switch Project` - Swtiches to the given project. Only needed for the API.
 


import cgi
import urllib

from google.appengine.api import users
from google.appengine.ext import ndb

from re import sub

import webapp2

ADD_PAGE_FORM = """\
     <form>
     Page name:
      <div><textarea name="url" rows="1" cols="30"></textarea></div>
      <input type="hidden" name="project_name" value = "%s">
      <input name = "command" type="submit" value="Add or Replace Page">
      <input name = "command" type="submit" value="Update Page">
      <br>
      <input name = "command" type="submit" value="Roll Back Page">
      <input name = "command" type="submit" value="View Page">
      <input name = "command" type="submit" value="Delete Page">
    </form>
    <hr>
"""

ADD_USER_FORM = """\
     <form>
     Username:
      <input type="hidden" name="project_name" value = "%s">
      <div><textarea name="user_name" rows = "1"cols="30"></textarea></div>
      <input name = "command" type="submit" value="Add Access">
      <input name = "command" type="submit" value="Remove Access">
      <br>
      <input name = "command" type="submit" value="Add Admin">
      <input name = "command" type="submit" value="Remove Admin">
    </form>
"""

ACCESS_FORM = """\
     <form>
     Access level:
      <input type="hidden" name="project_name" value = "%s">
      <input name = "command" type="submit" value="Make Private">
      <input name = "command" type="submit" value="Make Public">
    </form>
    <hr>
"""

SWITCH_PROJECT_FORM = """\
    <form>
    Project name:
      <div><input value="%s" name="project_name" cols="30"></div>
      <input name="command" type="submit" value="Create Project">
      <input name="command" type="submit" value="Switch Project">
      <input name="command" type="submit" value="Delete Project">
    </form>  
"""

DEFAULT_OUTPUT_TYPE = "html"

DEFAULT_PROJECT_NAME = 'default_project'


    
class Version(ndb.Model):
    ''' A single version of a web page.
        This is taken directly from the html and cannot be modified
        A Page may have multiple Versions as children'''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    creator = admins = ndb.UserProperty()
    version_id = ndb.IntegerProperty()
    contents = ndb.StringProperty(indexed=False)

class Page(ndb.Model):
    """Models an individual page, initiating user, url, and time added"""
    added_by = ndb.UserProperty()
    url = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)
    # Todo: Images
    
class Project(ndb.Model):
    ''' Models a project. Pages are stored as children.'''
    name = ndb.StringProperty()
    admins = ndb.UserProperty(repeated=True)
    members = ndb.UserProperty(repeated=True)
    public = ndb.BooleanProperty(default=False)

class MainPage(webapp2.RequestHandler):
    
    def status(self, message):
        self.result = message
        self.json['status'] = 'success'
        if self.output_type.lower() == "html" and message != 'success':
            self.response.write("<p><h1>"+message+"</h1></p><hr>")
            
    def page_to_json(self, project):
        self.json['project_name'] = str(project.name)
        self.json['access'] = "public" if project.public else "private"
        self.json['admins'] = [str(user) for user in project.admins]
        self.json['members'] = [str(user) for user in project.members]
        pages = []
        children = Page.query(ancestor=ndb.Key(Project, project.name)).fetch()
        for child in children:
            page = {'url': str(child.url), 'date_created': str(child.created)}
            page['added_by'] = str(child.added_by)
            pages.append(page)
            versions = []
            for v in Version.query(ancestor=ndb.Key(
                    Project,project.name, Page,child.url)).fetch():
                version = {'id': str(v.version_id)}
                version['date_created'] = str(v.time_added)
                version['creator'] = str(v.creator)
                versions.append(version)
            page['versions'] = versions
        self.json['pages'] = pages
                
            
    def create_project(self, project_name):
        ''' Creates a new project, with the current user as admin & member'''
        # Potential error cases:
        if not users.get_current_user():
            self.status("User is not currently logged in.")  
            return
        if Project.query(Project.name == project_name).fetch():
            self.status("Project already exists.")  
            return
        # Create the project itself.
        user = [users.get_current_user()]
        project = Project(
                id=project_name, name=project_name, admins=user, members=user)
        # Add to the database and return it.
        project.put()
        self.status('success')
        self.page_to_json(project)
        return project
        
    def add_page(self, keep_comments = False):
        ''' Adds a page to the current project, via "get"'''
        # Pre-prepare variables to simplify the construction itself.
        project_name = self.request.get('project_name',DEFAULT_PROJECT_NAME)
        key = ndb.Key("Project", project_name)
        user = users.get_current_user()
        url = self.request.get('url')
        # Try to grab the page. Return on any exception
        try:
            html = urllib.urlopen(url).read()
        except:
            self.status("Page not found.")  
            return
        # Add the page to the database if it does not exist, otherwise get it.
        if not Page.query(Page.url == url, ancestor=key).fetch():
            # Make the page
            page = Page(id=url, added_by=user, url=url,parent=key)
            page.put()
        else:
            page = ndb.Key("Project", project_name, "Page", url).get()
        # Add a new version at the current time 
        vid = Version.query().count()
        version = Version(
                parent=ndb.Key(Project, project_name,Page,page.url), id=vid)
        version.contents = sub(r'(?i)<script>.*?</script>{1}?', "", html)
        version.version_id = vid
        version.creator = user
        version.put()
        self.status('success')
        return page
        
    def view_page(self):
        ''' Views the stored HTML for the page. Images and css not included'''
        # Start by grabbing useful variables.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')    
        # Try to get the page. Return if it is not found.
        page = ndb.Key("Project", project_name, "Page", url).get()
        if not page:
            self.status("Page not found.")
            return False
        # Grab the latest version of the page.
        latest = Version.query(
                ancestor=ndb.Key("Project", project_name, "Page", page.url))
        latest = latest.order(-Version.time_added).fetch()
        self.response.write(latest[0].contents)
        return
        
    def roll_back(self):
        ''' Rolls back a page to the previous version. Requires admin access'''
        # Get the parameters
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        # Get all versions, sorted by time.
        latest = Version.query(
                ancestor=ndb.Key("Project", project_name, "Page", url))
        latest = latest.order(-Version.time_added).fetch()
        # If there is more than 1 version stored, delete the most recent.
        if len(latest) <= 1:
            self.status("Not enough versions found.")
            return
        ndb.Key("Project", project_name, "Page", url,
                "Version", latest[0].version_id).delete()
        self.status('success')
    
    def display_login(self):
        ''' Simply draws the login form for the api '''
        self.response.write("<hr>")
        if users.get_current_user():
            self.response.write("<p>Logged in as ")
            self.response.write(str(users.get_current_user()) + "</p>")
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        else:
            url = users.create_login_url(self.request.uri)
            url_linktext = 'Login'
        self.response.write('<a href="%s">%s</a>'% (url, url_linktext))
            
    def display_project(self, project_name, project):
        ''' Adds project details for the api '''
        # Firstly find the saved pages.
        pages_query = Page.query(
            ancestor=ndb.Key("Project", project_name)).order(-Page.created)
        pages = pages_query.fetch()
        # Write them if any are found.
        if pages:
            self.response.write(
                    "<p><h1>Pages for %s</h1></p>" % project_name)
            self.response.write(
                    "<b>Added" + "&nbsp;"*20 + "Page</b><br>")
        else:
            self.response.write(
                    "<b>No urls found for %s<BR>" % project_name)
        for page in pages:
            self.response.write(
                    str(page.created.strftime(
                            '<p>%y-%m-%d&nbsp%H:%M')) + "&nbsp;"*6)
            self.response.write(str(cgi.escape(page.url)) + "</p>")
        self.response.write(ADD_PAGE_FORM % cgi.escape(project_name))
        
    def display_admin(self, project_name):
        ''' Draws the admin and user access forms '''
        self.response.write(ADD_USER_FORM % cgi.escape(project_name))
        self.response.write(ACCESS_FORM % cgi.escape(project_name))
        
    def handle_commands(self, command, project_name):
        ''' Handles any commands passed by http get. '''
        # Project Selection Commands
        user = users.get_current_user()
        key = ndb.Key("Project", project_name)
        if command == 'Switch Project':
            self.redirect('/?'+urllib.urlencode({'project_name':project_name}))
            self.status('success')
            self.page_to_json(key.get())
            return
        if command == 'Create Project':
            return [self.create_project(project_name)]
        # Project commands
        project = key.get()
        if user not in project.members and not project.public:          
            self.status("Access denied.")
            return
        if command == "Add or Replace Page":
            self.add_page(False)
            return
        if command == "Update Page":
            self.add_page(True)
            return
        if command== "View Page":
            if self.view_page(): # If page exists.
                return False
            return
        ''' Admin commands '''
        if user not in project.admins:
            self.status("Access denied.")
            return
        if command == 'Delete Project':
            try:
               key.delete()
               self.status('success')
            except:
                self.status("Project not found.")
            return
        if command == "Roll Back Page":
            self.roll_back()
            return
        if command == "Delete Page":
            try:
                ndb.Key("Project", project_name, "Page",
                        self.request.get('url')).delete()
            except:
                self.status("Page not found.")
            return
        if command == "Make Public":
            project.public = True
        if command == "Make Private":
            project.public = False
        if not self.request.get('user_name'):
            self.status('success')
            project.put()
            return
        else:
            try:
                user_name = users.User(self.request.get('user_name'))
            except:
                self.status("User not recognised.")
                return
        # User access level commands.
        if self.request.get('command') == "Add Access":
            if user_name not in project.members:
                project.members.append(user_name)
        if self.request.get('command') == "Remove Access":
            if len(project.members) != 1:
                if user_name in project.members:
                    project.members.remove(user_name)
            else:
                self.status("Cannot remove final user from project.")
                return
        if self.request.get('command') == "Add Admin":
            if user_name not in project.admins:
                project.admins.append(user_name)
        if self.request.get('command') == "Remove Admin":
            if len(project.admins) != 1:
                if user_name in project.admins:
                    project.admins.remove(user_name)
            else:
                self.status("Cannot remove final admin from project.")
                return
        self.status('success')
        project.put()

    def get(self):
        ''' Draws the main page, and handles any commands '''
        self.result = None
        self.output_type = self.request.get('output_type', DEFAULT_OUTPUT_TYPE)
        self.json = {}
        if self.output_type.lower() == "html":
            self.response.write('<html><body>')
        project_name= self.request.get('project_name',DEFAULT_PROJECT_NAME)
        project = None
        command = self.request.get('command', None)
        # Handle all the different get commands'''
        if command:
            project = self.handle_commands(command, project_name)
            if project == False:
                self.response.write(repr(self.json))
                return
        # Get the project details.'''
        if users.get_current_user():
            if not project:  
                project = Project.query(Project.name == project_name).fetch(1)
            if project != [] and project[0] != None:
                if users.get_current_user() in project[0].members \
                        or project[0].public:
                    if self.output_type.lower() == "html":
                        self.display_project(project_name, project[0])
                        if users.get_current_user() in project[0].admins:
                            self.display_admin(project_name)
                    else:
                        if not self.result:
                            self.status('success')
                            self.page_to_json(project[0])
                else:
                    self.status("Access denied.")
            else:
                self.status("Project not found.")  
            # Project options.
            if self.output_type.lower() == 'html':  
                self.response.write(
                    SWITCH_PROJECT_FORM % cgi.escape(project_name))
        # Display project details'''
        if self.output_type.lower() == 'html':
            self.display_login()
            self.response.write("</body></html>")
        if self.output_type.lower() == 'json':
            self.response.write(repr(self.json))

application = webapp2.WSGIApplication([
    ('/', MainPage)
], debug=True)
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
      <input name = "command" type="submit" value="Add Page">
      <input name = "command" type="submit" value="View Page">
      <input name = "command" type="submit" value="Delete Page">
    </form>
    <hr>
"""

ADD_USER_FORM = """\
     <form>
     Username:
      <input type="hidden" name="project_name" value = "%s">
      <div><input name="user_name" cols="30"></div>
      <input name = "command" type="submit" value="Add Access">
      <input name = "command" type="submit" value="Remove Access">
      <input name = "command" type="submit" value="Make Admin">
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
# Admin console

DEFAULT_PROJECT_NAME = 'default_project'
    
class Version(ndb.Model):
    version_id = ndb.IntegerProperty()
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    contents = ndb.StringProperty(indexed=False)

class Page(ndb.Model):
    """Models an individual page, initiating user, url, and time added"""
    added_by = ndb.UserProperty()
    url = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)
    # Todo: Images
    
class Project(ndb.Model):
    name = ndb.StringProperty()
    admins = ndb.UserProperty(repeated=True)
    members = ndb.UserProperty(repeated=True)
    public = ndb.BooleanProperty(default=False)

class MainPage(webapp2.RequestHandler):
    
    def create_project(self, project_name):
        if not users.get_current_user():
            self.response.write("<p><h1>Not logged in.</h1></p><hr>")  
            return
        if Project.query(Project.name == project_name).fetch():
            self.response.write("<p><h1>Project already exists.</h1></p><hr>")  
            return
        user = [users.get_current_user()]
        project = Project(
                id=project_name, name=project_name, admins=user, members=user)
        project.put()
        return project
        
    def add_page(self):
        project_name = self.request.get('project_name',DEFAULT_PROJECT_NAME)
        user = users.get_current_user()
        url = self.request.get('url')
        if Page.query(Page.url == url,
                      ancestor=ndb.Key("Project", project_name)).fetch():
            self.response.write("<p><h1>Page already exists.</h1></p><hr>")  
            return
        try:
            html = urllib.urlopen(url).read()
        except:
            self.response.write("<p><h1>Page not found.</h1></p><hr>")  
            return
        # Make the page
        page = Page(
                id=url, added_by=user, url=url,
                parent=ndb.Key("Project", project_name))
        page.put()
        # Make the version
        version = Version(parent=ndb.Key(Project, project_name,Page,page.url))   
        version.version_id = Version.query().count()
        version.contents = sub(r'(?i)<script>.*?</script>{1}?', "", html)
        version.put()
        return page
        
    def view_page(self):
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')       
        pages = Page.query(ancestor=ndb.Key("Project", project_name)).fetch()
        page = None
        for p in pages:
            if p.url == url:
                page = p
        if not page:
            self.response.write("<p><h1>Page not found.</h1></p><hr>")
            return False
        latest = Version.query(
                ancestor=ndb.Key("Project", project_name, "Page", page.url))
        latest = latest.order(-Version.time_added).fetch()
        self.response.write(latest[0].contents)
        return True
    
    def display_login(self):
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
        # Print the page urls.
        pages_query = Page.query(
            ancestor=ndb.Key("Project", project_name)).order(-Page.created)
        pages = pages_query.fetch(10)
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
        
    def display_admin(self, project_name, project):
        self.response.write(ADD_USER_FORM % cgi.escape(project_name))
        self.response.write(ACCESS_FORM % cgi.escape(project_name))
        
    def handle_commands(self, command, project_name):
        user = users.get_current_user()
        if command == 'Switch Project':
            self.redirect(
                        '/?'+urllib.urlencode({'project_name':project_name}))
            return
        if command == 'Create Project':
            return [self.create_project(project_name)]
        if command == 'Delete Project':
            if user not in ndb.Key("Project", project_name).admins:
                self.response.write("<p><h1>Access denied..</h1></p>")
                return
            try:
                ndb.Key("Project", project_name).delete()
            except:
                self.response.write("<p><h1>Project not found.</h1></p>")
                return
        ''' Project commands '''
        if user not in ndb.Key("Project", project_name).get().members and \
                not ndb.Key("Project", project_name).get().public:          
            self.response.write("<p><h1>Access denied..</h1></p>")
            return
        if self.request.get('command') == "Add Page":
            self.add_page()
        if self.request.get('command') == "View Page":
            if self.view_page(): # If page exists.
                return
        ''' Admin commands '''
        if user not in ndb.Key("Project", project_name).get().admins:
            self.response.write("<p><h1>Access denied..</h1></p>")
            return
        if self.request.get('command') == "Delete Page":
            try:
                ndb.Key("Project", project_name, "Page",
                        self.request.get('url')).delete()
            except:
                self.response.write("<p><h1>Page not found.</h1></p>")
        if self.request.get('command') == "Make Public":
            self.response.write("Changing")
            ndb.Key("Project", project_name).get().public = True
            ndb.Key("Project", project_name).get().put()
        if self.request.get('command') == "Make Private":
            ndb.Key("Project", project_name).get().public = False
            ndb.Key("Project", project_name).get().put()

    def get(self):
        self.response.write('<html><body>')
        project_name= self.request.get('project_name',DEFAULT_PROJECT_NAME)
        project = None
        command = self.request.get('command', None)
        '''Handle all the different get commands'''
        if command:
            project = self.handle_commands(command, project_name)
        ''' Get the project details.'''
        if users.get_current_user():
            if not project:  
                project = Project.query(Project.name == project_name).fetch(1)
            if project != [] and project[0] != None:
                if users.get_current_user() in project[0].members \
                        or project[0].public:
                    self.display_project(project_name, project[0])
                    if users.get_current_user() in project[0].admins:
                        self.display_admin(project_name, project[0])
                else:
                    self.response.write("<p><h1>Access denied.</h1></p>")
            else:
                self.response.write("<p><h1>Project not found.</h1></p>")  
            # Project options.
            self.response.write(
                    SWITCH_PROJECT_FORM % cgi.escape(project_name))
        '''Display project details'''
        self.display_login()
        self.response.write("</body></html>")

application = webapp2.WSGIApplication([
    ('/', MainPage)
], debug=True)
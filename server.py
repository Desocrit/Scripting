import cgi
import urllib

from google.appengine.api import users
from google.appengine.ext import ndb

from re import sub

import webapp2
import re
import hashlib

ADD_PAGE_FORM = """\
     <form>
     Page name:
      <div><textarea name="url" rows="1" cols="30"></textarea></div>
      <input type="hidden" name="project_name" value = "%s">
      <input name = "command" type="submit" value="Add or Replace Page">
      <input name = "command" type="submit" value="Update Page">
      <br>
      <input name = "command" type="submit" value="Roll Back Page">
      <input name = "command" type="submit" value="Delete Page">
      <br>
      <input name = "command" type="submit" value="View Page">
      <input name = "command" type="submit" value="Page Details">
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


class AnnotationVersion(ndb.Model):
    ''' A version of an annotation.
        This can be checked and updated in realtime. '''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    creator = admins = ndb.UserProperty()
    av_id = ndb.IntegerProperty()
    contents = ndb.StringProperty(indexed=False)


class Annotation(ndb.Model):
    ''' An annotation. Contents are stored as AnnotationVersions '''
    creator = ndb.UserProperty()
    element_id = ndb.StringProperty()
    x_pos = ndb.IntegerProperty()
    y_pos = ndb.IntegerProperty()


class Version(ndb.Model):
    ''' A single version of a web page.
        This is taken directly from the html and cannot be modified
        A Page may have multiple Versions as children'''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    creator = admins = ndb.UserProperty()
    v_id = ndb.IntegerProperty()
    contents = ndb.StringProperty(indexed=False)


class Page(ndb.Model):
    """Models an individual page, initiating user, url, and time added"""
    creator = ndb.UserProperty()
    url = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)
    # Todo: Images


class Cached_CSS(ndb.Model):
    ''' A single version of a css file.'''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    hash = ndb.StringProperty()
    creator = admins = ndb.UserProperty()
    v_id = ndb.IntegerProperty()
    contents = ndb.StringProperty(indexed=False)
    url = ndb.StringProperty()
    proxy_url = ndb.StringProperty()


class CSS(ndb.Model):
    creator = ndb.UserProperty()
    url = ndb.StringProperty()
    css_id = ndb.IntegerProperty()


class Project(ndb.Model):
    ''' Models a project. Pages are stored as children.'''
    name = ndb.StringProperty()
    admins = ndb.UserProperty(repeated=True)
    members = ndb.UserProperty(repeated=True)
    public = ndb.BooleanProperty(default=False)


class MainPage(webapp2.RequestHandler):

    def gethref(self, url):
        href = re.search("href.*=.*(\"|')[^\"']*(\"|')", url).group(0)
        return re.search("(\"|')[^\"']*(\"|')", href).group(0)[1:-1]

    def completepath(self, url, baseurl):
        if url[0:2] == "//":
            url = re.match("[^/]*://", baseurl).group() + url[2:]
        elif url[0] == '/':
            url = re.match("https?://[^/]*/", baseurl).group() + url[1:]
        elif re.match("https?://", url):
            pass
        else:
            url = baseurl + url
        return url

    def getallcssurls(self, hrefs):
        css = []
        for href in hrefs:
            if re.search("rel.*=.*stylesheet", href):
                css.append(self.gethref(href))
        return css

    def getbaseurl(self, url, html):
        search = re.search("<.*base href.*=.*", html)
        if search:
            url = self.gethref(search.group())
        return url

    def status(self, message):
        self.json['status'] = message
        if self.output_type.lower() == "html" and message != 'success':
            self.response.write("<p><h1>"+message+"</h1></p><hr>")

    def project_to_json(self, project):
        self.json['project_name'] = str(project.name)
        self.json['access'] = "public" if project.public else "private"
        self.json['admins'] = [str(user) for user in project.admins]
        self.json['members'] = [str(user) for user in project.members]
        pages = []
        children = Page.query(ancestor=project.key).fetch()
        for child in children:
            page = {'url': str(child.url), 'date_created': str(child.created)}
            page['creator'] = str(child.creator)
            pages.append(page)
            versions = []
            for v in Version.query(ancestor=child.key).fetch():
                version = {'id': str(v.id)}
                version['date_created'] = str(v.time_added)
                version['creator'] = str(v.creator)
                versions.append(version)
            page['versions'] = versions
        self.json['pages'] = pages

    def page_to_json(self, project_name, page):
        json = {'url': str(page.url), 'date_created': str(page.created)}
        json['creator'] = str(page.creator)
        versions = []
        for v in Version.query(ancestor=page.key).fetch():
            version = {'id': str(v.v_id)}
            version['date_created'] = str(v.time_added)
            version['creator'] = str(v.creator)
            annotations = []
            for a in Annotation.query(ancestor=v.key).fetch():
                annotation = {'creator': str(a.creator)}
                annotation['x_pos'] = str(a.x_pos)
                annotation['y_pos'] = str(a.y_pos)
                vkey = ndb.Key(Project, project_name, Page, page.url,
                               Version, v.v_id, Annotation, a.element_id)
                latest = AnnotationVersion.query(ancestor=vkey)
                latest = latest.order(-AnnotationVersion.time_added)
                latest = latest.fetch(1)[0]
                annotation['contents'] = latest.contents
                annotations.append(annotation)
            version['annotations'] = annotations
            versions.append(version)
        json['versions'] = versions
        self.json = dict(self.json, **json)

    def page_dump(self):
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        if not url:
            self.status("Url not provided")
        page = ndb.Key(Project, project_name, Page, url).get()
        self.status('success')
        if self.output_type.lower() == 'json':
            self.page_to_json(project_name, page)
        else:
            self.response.write("Feature unavailable")
            return False
        return True

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
        self.project_to_json(project)
        return project

    def add_css(self, url, keep_comments=False):
        ''' Adds a css page to the current project, via "get"'''
        # Pre-prepare variables to simplify the construction itself.
        user = users.get_current_user()
        # Try to grab the page. Return on any exception
        try:
            contents = urllib.urlopen(url).read()
        except:
            self.status("CSS not found.")
            return
        hash = hashlib.md5(contents).hexdigest()
        latest = Cached_CSS.query(Cached_CSS.url == url)
        latest = latest.order(-Cached_CSS.time_added).fetch()
        needs_create = False
        if len(latest) > 0 and hash == latest[0].hash:
            version = latest[0]
            vid = version.v_id
            proxy_url = version.proxy_url
        else:
            needs_create = True
        if needs_create:
            vid = Cached_CSS.query().count()
            proxy_url += "css?id=" + str(vid)
            version = Cached_CSS(id=vid, v_id=vid,
                                 creator=user, hash=hash, url=url)
            version.contents = contents
            version.put()
        self.status('success')
        return (vid, proxy_url)

    def add_page(self, keep_comments=False):
        ''' Adds a page to the current project, via "get"'''
        # Pre-prepare variables to simplify the construction itself.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
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
            page = Page(id=url, creator=user, url=url, parent=key)
            page.put()
        else:
            page = ndb.Key("Project", project_name, "Page", url).get()
        css_ids = []
        hrefs = re.findall(".*href.*", html)
        baseurl = self.getbaseurl(url, html)
        cssurls = self.getallcssurls(hrefs)
        for cssurl in cssurls:
            (css_id, proxy_url) = self.add_css(
                self.completepath(cssurl, baseurl), keep_comments)
            css_ids.append(css_id)
            html = sub(re.escape(cssurl), proxy_url, html)
        # Add a new version at the current time
        vid = Version.query().count()
        version = Version(parent=page.key, id=vid, v_id=vid, creator=user)
        version.contents = sub(r'(?i)<script>.*?</script>{1}?', "", html)
        version.put()
        for css_id in css_ids:
            css = CSS(id=cssurl, creator=user, url=cssurl,
                      css_id=css_id, parent=version.key)
            css.put()
        self.status('success')
        return page

    def view_page(self):
        ''' Views the stored HTML for the page. Images and css not included'''
        # Start by grabbing useful variables.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        # Try to get the page. Return if it is not found.
        try:
            page = ndb.Key("Project", project_name, "Page", url).get()
            if not page:
                raise Exception
        except:
            self.status("Page not found.")
            return
        # Grab the latest version of the page.
        latest = Version.query(ancestor=page.key)
        latest = latest.order(-Version.time_added).fetch()
        self.response.write(latest[0].contents)
        return True

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
        latest[0].key.delete()
        self.status('success')

    def delete_version(self, version):
        for annotation in Annotation.query(ancestor=version).fetch():
            for av in AnnotationVersion.query(ancestor=annotation).fetch():
                av.key.delete()
            annotation.key.delete()
        version.delete()

    def delete_page(self, page):
        for version in Version.query(ancestor=page).fetch():
            self.delete_version(version.key)
        page.delete()

    def annotate(self):
        ''' Annotates a position in the page. Updates existing annotation
            if the annotation already exists. '''
        message = self.request.get('message')
        element_id = self.request.get('element_id')
        x_pos, y_pos = self.request.get('x_pos'), self.request.get('y_pos')
        try:
            x_pos = int(x_pos)
            y_pos = int(y_pos)
        except:
            self.status("Position arguments cannot be converted to integers.")
            return
        if not x_pos or not y_pos or not message or not element_id:
            self.status('Missing required parameters. Please update request.')
            return
        # Find the latest version of the url.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        key = ndb.Key("Project", project_name, "Page", url)
        if not key.get():
            self.status("Page not found")
            return
        latest = Version.query(ancestor=key)
        latest = latest.order(-Version.time_added).fetch(1)[0]
        annotation = Annotation.query(
            Annotation.x_pos == x_pos,
            Annotation.y_pos == y_pos,
            ancestor=latest.key
        ).fetch()
        if not annotation:
            # Create and attach an annotation.
            user = users.get_current_user()
            key = latest.key
            annotation = Annotation(id=element_id, element_id=element_id,
                                    parent=key, creator=user,
                                    x_pos=x_pos, y_pos=y_pos)
            annotation.put()
        key = annotation.key
        av_id = AnnotationVersion.query().count()
        version = AnnotationVersion(
            parent=key, id=av_id, contents=str(message))
        version.av_id = av_id
        version.creator = users.get_current_user()
        version.put()
        self.status('success')

    # HTML Viewing methods

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
        self.response.write('<a href="%s">%s</a>' % (url, url_linktext))

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
        command = command.replace("_", " ")
        # Project Selection Commands
        user = users.get_current_user()
        key = ndb.Key("Project", project_name)
        if command == 'switch project':
            self.redirect('/?' + urllib.urlencode(
                {'project_name': project_name}))
            self.status('success')
            self.project_to_json(key.get())
            return
        if command == 'create project':
            return [self.create_project(project_name)]
        # Project commands
        project = key.get()
        if user not in project.members and not project.public:
            self.status("Access denied.")
            return
        if command == "add or replace page":
            self.add_page(False)
            return
        if command == "update page":
            self.add_page(True)
            return
        if command == "view page":
            if self.view_page():  # If page exists.
                return False
            return
        if command == "page details":
            if self.page_dump():
                return False
            return
        if command == "annotate":
            self.annotate()
            return
        # Admin commands
        if user not in project.admins:
            self.status("Access denied.")
            return
        if command == 'delete project':
            try:
                for page in Page.query(ancestor=key).fetch():
                    self.delete_page(page.key)
                key.delete()
                self.status('success')
            except:
                self.status("Project not found.")
            return
        if command == "roll back page":
            self.roll_back()
            return
        if command == "delete page":
            try:
                self.delete_page(ndb.Key("Project", project_name,
                                         "Page", self.request.get('url')))
            except:
                self.status("Page not found.")
            return
        if command == "make public":
            project.public = True
        if command == "make private":
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
        if self.request.get('command') == "add access":
            if user_name not in project.members:
                project.members.append(user_name)
        if self.request.get('command') == "remove access":
            if len(project.members) != 1:
                if user_name in project.members:
                    project.members.remove(user_name)
            else:
                self.status("Cannot remove final user from project.")
                return
        if self.request.get('command') == "add admin":
            if user_name not in project.admins:
                project.admins.append(user_name)
        if self.request.get('command') == "remove admin":
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
        self.output_type = self.request.get('output_type', DEFAULT_OUTPUT_TYPE)
        self.json = {}
        if self.output_type.lower() == "html":
            self.response.write('<html><body>')
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        project = None
        command = self.request.get('command', None)
        # Handle all the different get commands'''
        if command:
            project = self.handle_commands(command.lower(), project_name)
            if project is False:  # Correct
                if self.output_type.lower() == 'json':
                    self.response.write(repr(self.json))
                return
        # Get the project details.'''
        if users.get_current_user():
            if not project:
                project = Project.query(Project.name == project_name).fetch(1)
            if project != [] and project[0] is not None:
                if users.get_current_user() in project[0].members \
                        or project[0].public:
                    if self.output_type.lower() == "html":
                        self.display_project(project_name, project[0])
                        if users.get_current_user() in project[0].admins:
                            self.display_admin(project_name)
                    elif 'status' not in self.json.keys():
                        self.status('success')
                        self.project_to_json(project[0])
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


class CSSPage(webapp2.RequestHandler):
    def get(self):
        css_id = int(self.request.get('id').encode('utf-8'))
        css = Cached_CSS.query(Cached_CSS.v_id == css_id).fetch()
        self.response.write(css[0].contents)

application = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/css', CSSPage)
], debug=True)

import cgi
import urllib2
import HTMLParser

from google.appengine.api import users
from google.appengine.ext import ndb

from re import sub
from json import dumps as dump

import webapp2
import re
from hashlib import md5

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


class TempPage(ndb.Model):
    ''' Saved settings of a user. '''
    user = ndb.UserProperty()
    temp_url = ndb.StringProperty()


class Annotation(ndb.Model):
    ''' An annotation. Contents are stored as String '''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    creator = ndb.UserProperty()
    element_id = ndb.StringProperty()
    x_pos = ndb.IntegerProperty()
    y_pos = ndb.IntegerProperty()
    uniqid = ndb.StringProperty()
    contents = ndb.StringProperty(indexed=False)


class Version(ndb.Model):
    ''' A single version of a web page.
        This is taken directly from the html and cannot be modified
        A Page may have multiple Versions as children'''
    time_added = ndb.DateTimeProperty(auto_now_add=True)
    creator = admins = ndb.UserProperty()
    v_id = ndb.IntegerProperty()
    contents = ndb.StringProperty(indexed=False)
    css_ids = ndb.IntegerProperty(repeated=True)


class Page(ndb.Model):
    """Models an individual page, initiating user, url, and time added"""
    creator = ndb.UserProperty()
    url = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)


class CSS(ndb.Model):
    ''' A cached css file.
        Hash is saved to save memory space. '''
    hash = ndb.StringProperty()
    contents = ndb.StringProperty(indexed=False)
    pages_using = ndb.IntegerProperty(default=1)


class Project(ndb.Model):
    ''' Models a project. Pages are stored as children.'''
    name = ndb.StringProperty()
    admins = ndb.UserProperty(repeated=True)
    members = ndb.UserProperty(repeated=True)
    public = ndb.BooleanProperty(default=False)


class MainPage(webapp2.RequestHandler):

    # Status stuff

    def warning(self, message):
        ''' Adds a warning to the output.
            This will be less urgent than an error. '''
        if not 'warnings' in self.json.keys():
            self.json['warnings'] = []
            if self.output_type.lower() == "html":
                self.response.write("<p>Warnings:</p>")
        self.json['warnings'].append(message)
        if self.output_type.lower() == "html":
                self.response.write(message)

    def status(self, message):
        ''' Sets the project status '''
        self.json['status'] = message
        if self.output_type.lower() == "html" and message != 'success':
            self.response.write("<p><h1>"+message+"</h1></p><hr>")

    # JSON stuff

    def get_projects_for_user(self, user):
        ''' Returns all the projects a user has access to '''
        admin = []
        admin_projs = Project.query(Project.admins == user).fetch()
        for proj in admin_projs:
            admin.append(str(proj.name))
        normal = []
        normal_projs = Project.query(Project.members == user).fetch()
        for proj in normal_projs:
            normal.append(str(proj.name))
        self.json['user'] = str(user)
        self.json['admin_access'] = admin
        self.json['normal_access'] = normal
        self.status('success')
        return True

    def project_to_json(self, project):
        ''' Shows details of a project, in json form.
            Goes as deep as versions, but not annotations '''
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
                version = {'id': str(v.v_id)}
                version['date_created'] = str(v.time_added)
                version['creator'] = str(v.creator)
                versions.append(version)
            page['versions'] = versions
        self.json['pages'] = pages

    def page_to_json(self, project_name, page, latest_only=False):
        ''' Converts a page, as well as all saved annotations, to json '''
        json = {'url': str(page.url), 'date_created': str(page.created)}
        json['creator'] = str(page.creator)
        versions = []
        query = Version.query(ancestor=page.key)
        query = query.order(-Version.time_added)
        for v in query.fetch(1) if latest_only else query.fetch():
            version = {'id': str(v.v_id)}
            version['date_created'] = str(v.time_added)
            version['creator'] = str(v.creator)
            annotations = []
            for a in Annotation.query(ancestor=v.key).fetch():
                annotation = {'creator': str(a.creator)}
                annotation['uniqid'] = str(a.uniqid)
                annotation['x_pos'] = str(a.x_pos)
                annotation['y_pos'] = str(a.y_pos)
                annotation['contents'] = str(a.contents)
                annotations.append(annotation)
            version['annotations'] = annotations
            versions.append(version)
        json['versions'] = versions
        self.json = dict(self.json, **json)

    def page_dump(self, latest_only=False):
        ''' Provides information on the contents of a page '''
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        if not url:
            self.status("Url not provided")
        page = ndb.Key(Project, project_name, Page, url).get()
        self.status('success')
        if self.output_type.lower() == 'json':
            self.page_to_json(project_name, page, latest_only)
        else:
            self.response.write("Feature unavailable")
            return False
        return True

    def annotation_dump(self):
        ''' Provides a list of annotations '''
        if self.output_type.lower() != 'json':
            self.response.write("Feature unavailable")
            return False
        url = self.request.get('url')
        if not url:
            self.status("Url not provided")
        try:
            page = Page.query(Page.url == url).fetch()[0]
        except:
            return self.status("Page not found.")
        ver = Version.query(ancestor=page.key)
        ver = ver.order(-Version.time_added).fetch(1)[0]
        annotations = []
        for a in Annotation.query(ancestor=ver.key):
            annotation = {'creator': str(a.creator)}
            annotation['x_pos'] = str(a.x_pos)
            annotation['y_pos'] = str(a.y_pos)
            annotation['element_id'] = a.element_id
            annotation['uniqid'] = a.uniqid
            annotation['contents'] = a.contents
            annotations.append(annotation)
        self.json['annotations'] = annotations
        self.status('success')

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

    def get_href(self, url):
        href = re.search("href.*=.*(\"|')[^\"']*(\"|')", url).group(0)
        return re.search("(\"|')[^\"']*(\"|')", href).group(0)[1:-1]

    def complete_href(self, url, href):
        ''' Checks a given href, and appends to the current url if needed '''
        if not href:
            return ""
        elif href[0:2] == "//":
            href = re.match("[^/]*://", url).group() + href[2:]
        elif href[0] == '/':
            try:
                href = re.match("https?://[^/]*/", url).group() + href[1:]
            except:
                return url + href
        elif not re.match("https?://", href):
            href = url + href
        return href

    def add_css(self, url):
        ''' Reads a css file, adding to or getting from the database. '''
        try:
            css = urllib2.urlopen(self.html.unescape(url)).read()
        except:
            return False

        hash = md5(css).hexdigest()
        existing_css = CSS.query(CSS.hash == hash).fetch()
        if existing_css:
            cached_css = existing_css[0]
            cached_css.pages_using += 1
            cached_css.put()
        else:
            cached_css = CSS(contents=css, hash=hash)
            cached_css.put()
            # Create proxy url
        self.status('success')
        return cached_css.key.id()

    def add_page(self, keep_comments=False):
        ''' Adds a page to the current project. '''
        # Get properties
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        key = ndb.Key("Project", project_name)
        user = users.get_current_user()
        url = self.request.get('url')
        # Try to grab the page. Return on any exception
        try:
            html = urllib2.urlopen(url).read()
            html = html.decode("utf-8")
        except:
            return self.print_js_error("Domain Not Found")
        
        # Add the page to the database if it does not exist, otherwise get it.
        if not Page.query(Page.url == url, ancestor=key).fetch():
            # Make the page
            page = Page(id=url, creator=user, url=url, parent=key)
            page.put()
        else:
            page = ndb.Key("Project", project_name, "Page", url).get()
        # Check to see if a base url is offered. If not, use current url.
        base_url = re.search("<.*base href.*=.*", html)
        if base_url:
            url = self.get_href(base_url.group())

        html, css_ids = self.replace_css_links(url, html)
        html = self.removeScripts(html)
        html = self.addElementIds(html)
        html = self.replace_links(url, html)
        html = self.replaceImages(url, html)

        notify  = '<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>'
        notify += '<script src="http://code.jquery.com/ui/1.10.3/jquery-ui.js"></script>'
        notify += '<script src="/static/inject.js"></script>'
        notify += '<link rel="stylesheet" href="http://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css" />'
        notify += '<link rel="stylesheet" href="/static/inject.css" />'
        notify += '<script>window.parent.pageChanged(\'' + url + '\', 1);</script>'
        html, n = re.subn('</body>', notify + '</body>', html)
        if n == 0:
            html += notify

        # Add a new version at the current time
        vid = Version.query().count()
        version = Version(parent=page.key, id=vid, v_id=vid, creator=user)
        version.contents = html
        version.css_ids = [ci for ci in css_ids if ci]
        version.put()
        return self.status('success')

    def view_page(self):
        ''' Views the stored HTML for the page. Images and css not included'''
        # Start by grabbing useful variables.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        # Try to get the page. Return if it is not found.
        page = ndb.Key("Project", project_name, "Page", url).get()
        if not page:
            return self.temp_get()
            #return self.print_js_error("Page not found")
        # Grab the latest version of the page.
        latest = Version.query(ancestor=page.key)
        latest = latest.order(-Version.time_added).fetch()
        self.response.write(latest[0].contents)
        return True

    def view_or_add(self):
        if self.view_page():
            return
        else:
            self.add_page()
            self.view_page()

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
        self.delete_version(latest[0].key)
        self.status('success')

    def delete_version(self, version):
        for annotation in Annotation.query(ancestor=version).fetch():
            annotation.key.delete()
        for css_id in version.get().css_ids:
            css = ndb.Key(CSS, css_id)
            if not css.get():
                continue
            css.get().pages_using -= 1
            if css.get().pages_using == 0:
                css.delete()
        version.delete()

    def delete_page(self, page):
        if not page.get:
            return False
        for version in Version.query(ancestor=page).fetch():
            self.delete_version(version.key)
        page.delete()

    def page_links(self):
        ''' Generates list of pages '''
        project_name = self.request.get('project_name')
        # Firstly find the saved pages.
        pages_query = Page.query(
            ancestor=ndb.Key("Project", project_name)).order(-Page.created)
        pages = pages_query.fetch()
        # Write them if any are found.
        if pages:
            self.response.write(
                "<p><h1>Pages for %s</h1></p>" % project_name)
        else:
            self.response.write(
                "<b>No urls found for %s<BR>" % project_name)
        for page in pages:
            self.response.write("<p>" + str(cgi.escape(page.url) + "</p>"))

    def get_page_links(self):
        ''' Lists all of the links on a page'''
        if self.output_type == 'html':
            return self.page_links(self)
        if self.output_type == 'json':
            project_name = self.request.get('project_name')
            pages_query = Page.query(
                ancestor=ndb.Key("Project", project_name)).order(-Page.created)
            pages = pages_query.fetch()
            self.json['pages'] = [page.url for page in pages]
            return self.status('success')

    def link_href(self, url, ext):
        result = '/end?command=temp_view&url='
        return result + cgi.escape(self.complete_href(url, ext))

    def replace_links(self, url, html):
        ''' Replaces all links in the html with 'temp page' links '''
        base_url = re.search("<.*base href.*=.*", html, re.DOTALL)
        if base_url:
            url = self.get_href(base_url.group())
        urls = re.findall('(<a.*?href\s*=\s*")(.*?)"', html, re.DOTALL)
        changed_urls = [self.link_href(url, ext[1]) for ext in urls]
        for i in range(len(urls)):
            old_url = urls[i][0] + urls[i][1]
            new_url = urls[i][0] + changed_urls[i]
            html = re.sub(re.escape(old_url), new_url, html)
        return html

    def replace_css_links(self, url, html):
        # Get the css IDs.
        hrefs = re.findall("<link.*?href.*?>", html)
        is_stylesheet = lambda x: re.search("rel.*=.*stylesheet", x)
        css_urls = [self.get_href(h) for h in hrefs if is_stylesheet(h)]
        css_ids = [self.add_css(self.complete_href(url, c)) for c in css_urls]
        for (css_url, css_id) in zip(css_urls, css_ids):
            if css_id:
                html = sub(re.escape(css_url),
                           "/css?id=" + str(css_id), html)
        return (html, css_ids)

    def addElementIds(self, html):
        ## Insert and id into all tags that dont contain one
        all_tags = re.findall("<[^/!].*?>", html)
        i = 0
        for tag in all_tags:
            if not re.search("id=", tag):
                end = -1
                if tag[-2] == '/':
                    end = -2
                newtag = tag[0:end] + ' id="ServerAddedTag' + \
                    str(i) + '"'+tag[end:]
                html = sub(re.escape(tag), newtag, html, 1)
                i += 1
        return html

    def replaceImages(self, url, html):
        imgs = re.findall("<img([^>]*) src=('|\")(.*?)('|\")", html, re.DOTALL)
        for img in imgs:
            html = sub(re.escape('<img' + img[0] + ' src=' + img[1] + img[2] + img[3]), \
                '<img' + img[0] + ' src=' + img[1] + self.complete_href(url, img[2]) + img[3], html)
        return html

    def removeScripts(self, html):
        return sub(r'<script(.)*?</script>', "", html, 0, re.DOTALL)

    def print_js_error(self, msg):
        self.response.write('<script>alert(\'' + msg + '\');</script>');
        return True

    def temp_get(self):
        ''' Grabs a temporary version of the page, ready to save on-demand '''
        # Get some details.
        url = self.request.get('url')
        if not url:
            return self.print_js_error("Url not found")
        try:
            page = urllib2.urlopen(url)
            url  = page.geturl()
            html = page.read()
            html = html.decode("utf-8")
        except Exception as inst:
            return self.print_js_error("Domain Not Found")

        user = users.get_current_user()
        if not user:
            return self.print_js_error("You must be logged in to use this command")

        # Save the page details
        tp = TempPage.query(TempPage.user == user).fetch()
        if tp == []:
            tp = TempPage(user=user, temp_url=url)
            tp.put()
        else:
            tp[0].temp_url = url

        html, css = self.replace_css_links(url, html)
        html = self.replace_links(url, html)
        html = self.removeScripts(html)
        html = self.replaceImages(url, html)

        notify  = '<script>window.parent.pageChanged(\'' + url + '\', 0);</script>'
        html, n = re.subn('</body>', notify + '</body>', html)
        if n == 0:
            html += notify

        self.response.write(html)
        return True

    def get_temp_page(self):
        ''' Grabs the temporarily saved page '''
        user = users.get_current_user()
        if not user:
            return self.status("You must be logged in to use this command")
        query = TempPage.query(TempPage.user == user).fetch()[0]
        if not query or not query.temp_url:
            return self.status("No temp page found.")
        return self.add_page(query.temp_url)
    
    def delete_annotation(self):
        uid = self.request.get("uniqid")
        if not uid:
            return self.status("No UID was specified")
        annotation = Annotation.query(Annotation.uniqid==uid).fetch()
        if not annotation:
            return self.status("No annotation with that UID")
        annotation[0].key.delete()
        self.status('success')
            

    def annotate(self):
        ''' Annotates a position in the page. Updates existing annotation
        if the annotation already exists. '''
        message = self.request.get('message')
        element_id = self.request.get('element_id')
        x_pos, y_pos = self.request.get('x_pos'), self.request.get('y_pos')
        uid = self.request.get("uniqid")
        try:
            x_pos = int(x_pos)
            y_pos = int(y_pos)
        except:
            return self.status("Arguments cannot be converted to integers.")
        if not x_pos or not y_pos or not message or not element_id or not uid:
            return self.status('Missing parameters. See readme for details.')
        # Find the latest version of the url.
        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        url = self.request.get('url')
        key = ndb.Key("Project", project_name, "Page", url)
        if not key.get():
            return self.status("Page not found")
        latest = Version.query(ancestor=key)
        latest = latest.order(-Version.time_added).fetch(1)[0]
        annotation = Annotation.query(Annotation.uniqid == uid,
                                      ancestor=latest.key).fetch()
        user = users.get_current_user()
        if not annotation:
            # Create and attach an annotation.
            key = latest.key
            annotation = Annotation(id=uid, element_id=element_id,
                                    uniqid=uid, parent=key, creator=user,
                                    x_pos=x_pos, y_pos=y_pos)
            annotation.contents = str(message)
            annotation.put()
        else:
            annotation[0].contents = str(message)
            annotation[0].x_pos = x_pos
            annotation[0].y_pos = y_pos
            annotation[0].put()
        self.status('success')

    # HTML Viewing methods

    def display_login(self):
        ''' Simply draws the login form for the api '''
        self.response.write("<hr>")
        if users.get_current_user():
            self.response.write("<p>Logged in as ")
            self.response.write(str(users.get_current_user()) + "</p>")
            url = users.create_logout_url(self.request.uri)
            url_linkthref = 'Logout'
        else:
            url = users.create_login_url(self.request.uri)
            url_linkthref = 'Login'
        self.response.write('<a href="%s">%s</a>' % (url, url_linkthref))

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

    def list_users_on_project(self, project_name):
        project = ndb.Key(Project, project_name).get()
        self.json['users'] = [user.email() for user in project.members]
        self.json['admins'] = [user.email() for user in project.admins]
        return self.status('success')

    def delete_all(self, project_name):
        project = ndb.Key(Project, project_name)
        for page in Page.query(ancestor=project).fetch():
            self.delete_page(page.key)

    def add_user(self):
        user = self.request.get('user')
        pn = self.request.get('project name', DEFAULT_PROJECT_NAME)
        project = ndb.Key(Project, pn)
        if not project.get():
            return self.status("Project not found")
        project.get().members.append(users.User(user))
        return self.status('success')

    def handle_login(self, command):
        redirect = self.request.get('redirect_url')
        user = users.get_current_user()
        if not redirect:
            redirect = "/"
            if self.request.get('project_name'):
                redirect += self.request.get('project_name')
        if command == 'logout':
            if user:
                self.json['logout_url'] = users.create_logout_url('/');
                self.status('success');
            else:
                self.status('fail');
        elif command == 'login':
            self.json['login_url'] = users.create_login_url('/')
            self.status('success');
        elif command == 'get user':
            if user:
                self.json['username'] = user.email()
                self.status('true')
            else:
                self.status('false')
            return True


    def handle_page_commands(self, command, project, user):
        ''' Handles commands related to pages. '''
        if command == "add or replace page":
            return self.add_page(False)
        if command == "update page":
            return self.add_page(True)
        if command == "view page":
            self.view_page()  # If page exists.
            return True
        if command == "view or add page":
            return self.view_or_add()
        if command == "page details":
            return self.page_dump(latest_only=False)
        if command == "latest page details":
            return self.page_dump(latest_only=True)
        if command == "annotate":
            return self.annotate()
        if command == "get annotations":
            return self.annotation_dump()
        if command == "delete annotation":
            return self.delete_annotation()
        if command == "page links":
            return self.get_page_links()

    def handle_commands(self, command, project_name):
        ''' Handles any commands passed by http get.
            Return True if you don't want the page to load afterwards.'''
        command = command.lower().replace("_", " ")
        # Login Commands
        if command in ['login', 'logout', 'smart login', 'get user']:
            return self.handle_login(command)
        if command == 'add user':
            return self.add_user()
        # Temporary viewing commands.
        if command == 'temp view':
            return self.temp_get()
        if command == 'grab temp page':
            return self.get_temp_page()

        # Project Selection Commands
        user = users.get_current_user()
        key = ndb.Key("Project", project_name)
        if command == 'switch project':
            self.redirect('/?' + urllib2.urlencode(
                {'project_name': project_name}))
            self.project_to_json(key.get())
            return self.status('success')
        if command == 'create project':
            return [self.create_project(project_name)]
        if command == 'list projects':
            return self.get_projects_for_user(user)
        if command == 'list users':
            return self.list_users_on_project(project_name)

        # Page commands
        project = key.get()
        if not project:
            return
        if user not in project.members and not project.public:
            return self.status("Access denied.")
        if command in ['add or replace page', 'update page', 'view page',
                       'view or add page', 'page details', 'page links',
                       'latest page details', 'annotate', 'get annotations',
                       'delete annotation']:
            return self.handle_page_commands(command, project, user)

        # Admin commands
        if user not in project.admins:
            return self.status("Access denied.")
        if command == 'delete all':
            return self.delete_all(project_name)
        if command == 'delete project':
            try:
                for page in Page.query(ancestor=key).fetch():
                    self.delete_page(page.key)
                key.delete()
                return self.status('success')
            except:
                return self.status("Project not found.")
        if command == "roll back page":
            return self.roll_back()
        if command == "delete page":
            if self.delete_page(
                ndb.Key(
                    "Project", project_name,
                    "Page", self.request.get('url'))) is False:
                self.status("Page not found.")
            return
        if command == "make public":
            project.public = True
        if command == "make private":
            project.public = False
        if not self.request.get('user_name'):
            project.put()
            return self.status('success')
        else:
            try:
                user_name = users.User(self.request.get('user_name'))
            except:
                return self.status("User not recognised.")

        # User access level commands.
        if command == "add access":
            if user_name not in project.members:
                project.members.append(user_name)
                project.put()
            
            return self.status('success')
        if command == "remove access":
            if len(project.members) != 1:
                if user_name in project.members:
                    project.members.remove(user_name)
                    project.put()

                return self.status("success")
            else:
                return self.status("Cannot remove final user from project.")
        if command == "add admin":
            if user_name not in project.admins:
                project.admins.append(user_name)
                project.put()
            
            return self.status('success')
        if command == "remove admin":
            if len(project.admins) != 1:
                if user_name in project.admins:
                    project.admins.remove(user_name)
                    project.put()

                return self.status("success")
            else:
                return self.status("Cannot remove final admin from project.")

        self.status('command not found')
        project.put()

    def get(self):
        ''' Draws the main page, and handles any commands '''
        self.output_type = self.request.get('output_type', DEFAULT_OUTPUT_TYPE)
        self.json = {}
        self.html = HTMLParser.HTMLParser()

        # This is only required for the dev pages, and they don't need
        # to be compliant. But it was printing this out at inappropriate
        # times so I removed
        #if self.output_type.lower() == "html":
            #self.response.write('<html><body>')

        project_name = self.request.get('project_name', DEFAULT_PROJECT_NAME)
        project = None
        command = self.request.get('command', None)
        # Handle all the different get commands'''
        if command:
            project = self.handle_commands(command, project_name)
            if project is True:
                if self.output_type.lower() == 'json':
                    self.response.write(dump(self.json, indent=4))
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
            self.response.write(dump(self.json, indent=4))


class CSSPage(webapp2.RequestHandler):
    def get(self):
        try:
            css_id = int(self.request.get('id').encode('utf-8'))
        except:
            self.response.write("Malformed ID.")
        css = ndb.Key(CSS, css_id)

        self.response.headers["Content-Type"] = "text/css"
        self.response.write(css.get().contents)


application = webapp2.WSGIApplication([
    ('/end', MainPage),
    ('/css', CSSPage)
], debug=True)

          # -*- coding: utf-8 -*-
import logging
import tornado.options
from tornado.options import define, options
import tornado.web
import os.path

# На каком порту запсукаемся
define("port", default=8888, type=int)

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/auth/login", AuthLoginHandler),
            (r"/auth/logout", AuthLogoutHandler),
            (r"/a/message/new", MessageNewHandler),
            (r"/a/message/updates", MessageUpdatesHandler),
        ]
        settings = dict(
            cookie_secret="43oETzKXQAGaYdkL5gEmGeJJFuYh7EQnp2XdTP1o/Vo=",
            login_url="/auth/login",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
            debug=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        user = self.get_secure_cookie("user")
        if not user:
            return None
        return user

class MainHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.render("index.html")

class MessageMixin(object):
    # Пользователи ожидающие сообщений
    waiters = set()
    # Пользователи онлайн
    users_online = set()
    def wait_for_messages(self, callback):
        cls = MessageMixin
        cls.waiters.add(callback)

    def add_to_users_online(self, username):
        cls = MessageMixin
        cls.users_online.add(username)

    def remove_from_users_online(self, username):
        cls = MessageMixin
        cls.users_online.remove(username)

    def new_messages(self, messages):
        cls = MessageMixin
        for callback in cls.waiters:
            try:
                print "send message"
                callback(messages)
            except:
                logging.error("Error in waiter callback", exc_info=True)
        cls.waiters = set()

class MessageUpdatesHandler(BaseHandler, MessageMixin):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.wait_for_messages(self.on_new_messages)
        self.add_to_users_online(self.get_current_user())

    def on_new_messages(self, messages):
        self.finish(messages)

    def on_connection_close(self):
        self.remove_from_users_online(self.get_current_user())

class MessageNewHandler(BaseHandler, MessageMixin):
    @tornado.web.authenticated
    def post(self):
        message = self.render_string("message.html", message=self.get_argument("message"))
        self.new_messages(message)

class AuthLoginHandler(BaseHandler):
    def get(self):
        self.render("login.html")

    def post(self):
        name = self.get_argument("name")
        self.set_secure_cookie("user", name)
        self.redirect("/")

class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect("/")

def main():
    # Модуль принимает опции в командной строке(-port:8888)
    tornado.options.parse_command_line()
    app = Application()
    # Запуск сервера с опцией port
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()
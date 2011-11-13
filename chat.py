          # -*- coding: utf-8 -*-
import logging
import uuid
import tornado.options
from tornado.options import define, options
import tornado.web
import os.path
import datetime
import time, threading

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

    def get_user_id(self):
        user_id = self.get_secure_cookie("user_id")
        return user_id


class MessageMixin(object):
    # Ответвленные нити
    threads = set()
    ttt = True
    # Пользователи ожидающие сообщений
    waiters = set()
    # Пользователи онлайн
    users_online = []
    messages_cache = []
    cache_size = 20

    def wait_for_messages(self, callback):
        cls = MessageMixin
        cls.waiters.add(callback)

    def new_messages(self, message):
        cls = MessageMixin
        for callback in cls.waiters:
            try:
                callback.on_new_messages(message)
            except:
                logging.error("Error in waiter callback", exc_info=True)
        cls.waiters = set()
        cls.messages_cache.extend([message])
        if len(cls.messages_cache) > self.cache_size:
            cls.messages_cache = cls.messages_cache[-self.cache_size:]

    def private_message(self, message, message2, private, myid):
        cls = MessageMixin
        new_callback = []
        if myid == private:
            for callback in cls.waiters:
                if callback.get_user_id() == private:
                    callback.on_new_messages(message)
                    new_callback.append(callback)
        else:
            for callback in cls.waiters:
                if callback.get_user_id() == private:
                    callback.on_new_messages(message)
                    new_callback.append(callback)
                if callback.get_user_id() == myid:
                    callback.on_new_messages(message2)
                    new_callback.append(callback)
        for i in new_callback:
            cls.waiters.remove(i)

    def direct_message(self, message, message2, personals, myid):
        cls = MessageMixin
        for callback in cls.waiters:
            if callback.get_user_id() in personals:
                callback.on_new_messages(message)
            else:
                callback.on_new_messages(message2)
        cls.waiters = set()
        cls.messages_cache.extend([message2])
        if len(cls.messages_cache) > self.cache_size:
            cls.messages_cache = cls.messages_cache[-self.cache_size:]

    def add_to_users_online(self, user):
        cls = MessageMixin
        user_html = user.render_string("user.html", user=user.get_current_user(), user_id=user.get_user_id())
        if not user_html in cls.users_online:
            self.new_user(user)

    def cancel_wait(self, callback):
        cls = MessageMixin
        cls.waiters.remove(callback)

    def user_is_out(self, user, timeout):
        cls = MessageMixin
        time = datetime.datetime.time(datetime.datetime.now()).strftime("%H:%M")
        if timeout:
            message = {
                "type": "user_is_out",
                "user_id": user.get_user_id(),
                "html": user.render_string("message_out.html", message="%s ушел(timeout)" % user.get_current_user(), time = time, id=user.get_user_id()),
            }
        else:
            message = {
                "type": "user_is_out",
                "user_id": user.get_user_id(),
                "html": user.render_string("message_out.html", message="%s ушел(сам)" % user.get_current_user(), time = time, id=user.get_user_id()),
            }
        self.new_messages(message)
        cls.users_online.remove(user.render_string("user.html", user=user.get_current_user(), user_id=user.get_user_id()))

    def new_user(self, user):
        cls = MessageMixin
        time = datetime.datetime.time(datetime.datetime.now()).strftime("%H:%M")
        message = {
            "type": "new_user",
            "user": user.render_string("user.html", user=user.get_current_user(), user_id=user.get_user_id()),
            "html": user.render_string("message_out.html", message="К нам пришел %s" % user.get_current_user(), time = time),
        }
        self.new_messages(message)
        cls.users_online.extend([message["user"]])

class MainHandler(BaseHandler, MessageMixin):
    @tornado.web.authenticated
    def get(self):
        # Тут по замыслу надо будет проверять по базе уходил ли пользователь
        self.add_to_users_online(self)
        self.render("index.html", messages=MessageMixin.messages_cache, users_online=MessageMixin.users_online)

class MessageUpdatesHandler(BaseHandler, MessageMixin):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.wait_for_messages(self)

    def on_new_messages(self, messages):
        self.finish(messages)

    def on_new_user(self, user):
        self.finish(user)

    def is_user_out(self):
        cls = MessageMixin
        time.sleep(5)
        user_online = False
        if cls.ttt:
            for user in cls.waiters:
                if user.get_current_user() == self.get_current_user():
                    user_online = True
            if not user_online:
                self.user_is_out(self,timeout=True)
        cls.ttt = True
        cls.threads.remove(self.get_current_user())

    def on_connection_close(self):
        cls = MessageMixin
        thread_is_run = False
        for i in cls.threads:
            if i == self.get_current_user():
                thread_is_run = True
        self.cancel_wait(self)
        if not thread_is_run:
            t = threading.Thread(target=self.is_user_out)
            t.setDaemon(True)
            t.name = self.get_current_user()
            t.start()
            cls.threads.add(t.name)

class MessageNewHandler(BaseHandler, MessageMixin):
    @tornado.web.authenticated
    def post(self):
        try:
            personals = self.get_arguments("personal[]")
            personals_name = []
            cls = MessageMixin
            for i in cls.waiters:
                if i.get_user_id() in personals:
                    personals_name.append(i.get_current_user())
        except:
            personals = False
        try:
            private = self.get_argument("private")
            cls = MessageMixin
            for i in cls.waiters:
                if i.get_user_id() == private:
                    private_to = i.get_current_user()
        except :
            private = False
        time = datetime.datetime.time(datetime.datetime.now()).strftime("%H:%M")
        if private:
            message = {
                "private" : "True",
                "type": "new_message",
                "html": self.render_string("private_message.html", message=self.get_argument("message"), time = time, who="тебя"),
            }
            message2 = {
                "private" : "True",
                "type": "new_message",
                "html": self.render_string("private_message.html", message=self.get_argument("message"), time = time, who=private_to, id=self.get_user_id()),
            }
        elif personals:
            message = {
                "type": "new_message",
                "html": self.render_string("direct_message.html", message=self.get_argument("message"), time = time, personals=personals_name, id=self.get_user_id()),
            }
            message2 = {
                "type": "new_message",
                "html": self.render_string("direct_message_all.html", message=self.get_argument("message"), time = time, personals=personals_name, id=self.get_user_id()),
            }
        else:
            message = {
                "type": "new_message",
                "html": self.render_string("message.html", message=self.get_argument("message"), time = time, id=self.get_user_id()),
            }
        # Формируется html сообщениe
        if private:
            self.private_message(message, message2, private, self.get_user_id())
        elif personals:
            self.direct_message(message, message2, personals, self.get_user_id())
        else:
            self.new_messages(message)

class AuthLoginHandler(BaseHandler, MessageMixin):
    def get(self):
        self.render("login.html")

    def post(self):
        name = self.get_argument("name")
        self.set_secure_cookie("user", name)
        self.set_secure_cookie("user_id", str(uuid.uuid4()))
        self.redirect("/")

class AuthLogoutHandler(BaseHandler, MessageMixin):
    def get(self):
        cls = MessageMixin
        self.clear_cookie("user")
        self.redirect("/")
        cls.ttt = False
        self.user_is_out(self, timeout=False)

def main():
    # Модуль принимает опции в командной строке(-port:8888)
    tornado.options.parse_command_line()
    app = Application()
    # Запуск сервера с опцией port
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()

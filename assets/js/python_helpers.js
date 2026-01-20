window.TURTLE_SHIM = `
import math
import sys
from js import window
from js import prompt as js_prompt

def emit(id, cmd, *args):
    # Convert args to list for JS
    # In Pyodide, arguments are passed as *args
    window.pushTurtleCmd(id, cmd, list(args))

class TurtleScreen:
    def __init__(self):
        self._bgcolor = "white"

    def bgcolor(self, color=None):
        if color is not None:
            self._bgcolor = color
            emit(None, "bgcolor", color)
        return self._bgcolor

    def clear(self):
        emit(None, "clear_screen")

    def setup(self, width=0.5, height=0.75, startx=None, starty=None):
        pass

    def bye(self):
        emit(None, "bye")

    def textinput(self, title, prompt):
        # Placeholder: This should be transformed by InputTransformer to async_textinput
        # If not transformed (e.g. inside function), it will return None or raise error if we don't handle it.
        print(f"Warning: textinput('{title}', '{prompt}') called synchronously. It might not work as expected.")
        return None

    def numinput(self, title, prompt, default=None, minval=None, maxval=None):
        # Placeholder
        print(f"Warning: numinput('{title}', '{prompt}') called synchronously.")
        return default

    def exitonclick(self):
        pass

_SCREEN = TurtleScreen()

def Screen():
    return _SCREEN

_turtle_id_counter = 0

class Turtle:
    def __init__(self, shape="classic", undobuffersize=1000, visible=True):
        global _turtle_id_counter
        self._id = _turtle_id_counter
        _turtle_id_counter += 1

        self._x = 0.0
        self._y = 0.0
        self._angle = 0.0 # Degrees. 0 = East
        self._pen_down = True
        self._pencolor = "black"
        self._fillcolor = "black"
        self._pensize = 1
        self._speed = 6
        self._visible = visible
        self._is_filling = False
        self._shape = shape

        emit(self._id, "create_turtle")
        if shape:
            self.shape(shape)

    def forward(self, distance):
        rad = math.radians(self._angle)
        self._x += distance * math.cos(rad)
        self._y += distance * math.sin(rad)
        emit(self._id, "forward", distance)

    def fd(self, distance): self.forward(distance)

    def backward(self, distance):
        self.forward(-distance)

    def bk(self, distance): self.forward(-distance)
    def back(self, distance): self.forward(-distance)

    def right(self, angle):
        self._angle -= angle
        emit(self._id, "right", angle)

    def rt(self, angle): self.right(angle)

    def left(self, angle):
        self._angle += angle
        emit(self._id, "left", angle)

    def lt(self, angle): self.left(angle)

    def goto(self, x, y=None):
        if y is None: x, y = x
        self._x = float(x)
        self._y = float(y)
        emit(self._id, "goto", self._x, self._y)

    def setpos(self, x, y=None): self.goto(x, y)
    def setposition(self, x, y=None): self.goto(x, y)

    def setx(self, x): self.goto(x, self._y)
    def sety(self, y): self.goto(self._x, y)

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def circle(self, radius, extent=None, steps=None):
        if extent is None: extent = 360
        if steps is None: steps = int(max(3, min(abs(radius)*3.14/math.sin(math.pi/3), abs(extent)/2)))

        frac = abs(extent) / 360
        steps = steps or int(min(11+abs(radius)/6.0, 59.0) * frac)
        w = extent / steps
        w2 = 0.5 * w
        l = 2.0 * radius * math.sin(math.radians(w2))
        if radius < 0:
            l, w, w2 = -l, -w, -w2

        for i in range(steps):
            self.left(w2)
            self.forward(l)
            self.left(w2)

    def speed(self, s):
        self._speed = s
        emit(self._id, "speed", s)

    def penup(self):
        self._pen_down = False
        emit(self._id, "penup")
    def pu(self): self.penup()
    def up(self): self.penup()

    def pendown(self):
        self._pen_down = True
        emit(self._id, "pendown")
    def pd(self): self.pendown()
    def down(self): self.pendown()

    def isdown(self): return self._pen_down

    def width(self, w):
        self._pensize = w
        emit(self._id, "pensize", w)
    def pensize(self, w=None):
        if w is None: return self._pensize
        self.width(w)

    def color(self, *args):
        if len(args) == 0: return self._pencolor, self._fillcolor
        pcolor = args[0]
        fcolor = args[0]
        if len(args) == 2:
            fcolor = args[1]
        self._pencolor = pcolor
        self._fillcolor = fcolor
        emit(self._id, "color", pcolor, fcolor)

    def pencolor(self, *args):
        if len(args) == 0: return self._pencolor
        self._pencolor = args[0]
        emit(self._id, "pencolor", self._pencolor)

    def fillcolor(self, *args):
        if len(args) == 0: return self._fillcolor
        self._fillcolor = args[0]
        emit(self._id, "fillcolor", self._fillcolor)

    def begin_fill(self):
        self._is_filling = True
        emit(self._id, "begin_fill")

    def end_fill(self):
        self._is_filling = False
        emit(self._id, "end_fill")

    def write(self, arg, move=False, align="left", font=("Arial", 8, "normal")):
        emit(self._id, "write", str(arg), move, align, font)

    def showturtle(self):
        self._visible = True
        emit(self._id, "showturtle")
    def st(self): self.showturtle()

    def hideturtle(self):
        self._visible = False
        emit(self._id, "hideturtle")
    def ht(self): self.hideturtle()

    def isvisible(self): return self._visible

    def shape(self, name):
        self._shape = name
        emit(self._id, "shape", name)

    def setheading(self, to_angle):
        diff = to_angle - self._angle
        self.left(diff)
    def seth(self, to_angle): self.setheading(to_angle)

    def heading(self): return abs(self._angle % 360)

    def xcor(self): return self._x
    def ycor(self): return self._y
    def position(self): return (self._x, self._y)
    def pos(self): return (self._x, self._y)

    def clear(self):
        emit(self._id, "clear")

    def reset(self):
        self._x = 0; self._y = 0; self._angle = 0
        self._pen_down = True; self._pencolor="black"; self._fillcolor="black"
        emit(self._id, "reset")

_default_turtle = Turtle()

def forward(distance): _default_turtle.forward(distance)
def fd(distance): _default_turtle.fd(distance)
def backward(distance): _default_turtle.backward(distance)
def bk(distance): _default_turtle.bk(distance)
def back(distance): _default_turtle.back(distance)
def right(angle): _default_turtle.right(angle)
def rt(angle): _default_turtle.rt(angle)
def left(angle): _default_turtle.left(angle)
def lt(angle): _default_turtle.lt(angle)
def goto(x, y=None): _default_turtle.goto(x, y)
def setpos(x, y=None): _default_turtle.setpos(x, y)
def setposition(x, y=None): _default_turtle.setposition(x, y)
def setx(x): _default_turtle.setx(x)
def sety(y): _default_turtle.sety(y)
def home(): _default_turtle.home()
def circle(radius, extent=None, steps=None): _default_turtle.circle(radius, extent, steps)
def speed(s): _default_turtle.speed(s)
def penup(): _default_turtle.penup()
def pu(): _default_turtle.pu()
def up(): _default_turtle.up()
def pendown(): _default_turtle.pendown()
def pd(): _default_turtle.pd()
def down(): _default_turtle.down()
def isdown(): return _default_turtle.isdown()
def width(w): _default_turtle.width(w)
def pensize(w=None): return _default_turtle.pensize(w)
def color(*args): _default_turtle.color(*args)
def pencolor(*args): return _default_turtle.pencolor(*args)
def fillcolor(*args): return _default_turtle.fillcolor(*args)
def begin_fill(): _default_turtle.begin_fill()
def end_fill(): _default_turtle.end_fill()
def write(arg, move=False, align="left", font=("Arial", 8, "normal")): _default_turtle.write(arg, move, align, font)
def showturtle(): _default_turtle.showturtle()
def st(): _default_turtle.st()
def hideturtle(): _default_turtle.hideturtle()
def ht(): _default_turtle.ht()
def isvisible(): return _default_turtle.isvisible()
def shape(name): _default_turtle.shape(name)
def setheading(to_angle): _default_turtle.setheading(to_angle)
def seth(to_angle): _default_turtle.seth(to_angle)
def heading(): return _default_turtle.heading()
def xcor(): return _default_turtle.xcor()
def ycor(): return _default_turtle.ycor()
def position(): return _default_turtle.position()
def pos(): return _default_turtle.pos()
def done(): pass
def mainloop(): pass
def bgcolor(c): _SCREEN.bgcolor(c)
def clear(): _default_turtle.clear()
def reset(): _default_turtle.reset()
def textinput(title, prompt): return _SCREEN.textinput(title, prompt)
def numinput(title, prompt, default=None, minval=None, maxval=None): return _SCREEN.numinput(title, prompt, default, minval, maxval)
def exitonclick(): _SCREEN.exitonclick()
`;

window.PYTHON_HELPERS = `
import rlcompleter
import inspect
import sys
import __main__

def get_completions(token):
    try:
        # Create a completer that uses the main module's namespace
        completer = rlcompleter.Completer(__main__.__dict__)

        matches = []
        state = 0
        while True:
            match = completer.complete(token, state)
            if match is None:
                break
            matches.append(match)
            state += 1
            if state > 50: break # Limit results

        return matches
    except:
        return []

def get_docstring(name):
    try:
        obj = eval(name, __main__.__dict__)
        doc = inspect.getdoc(obj)
        if doc:
            return doc[:1000] + ("..." if len(doc) > 1000 else "")

        # If no doc, try signature
        try:
            sig = str(inspect.signature(obj))
            return sig
        except:
            pass

        return None
    except:
        return None
`;

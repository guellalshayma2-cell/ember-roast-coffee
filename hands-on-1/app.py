from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    # host="0.0.0.0" makes the app reachable from other devices on your network
    # using your machine's IP address and port 8000 (e.g. http://192.168.x.x:8000)
    # debug is kept off because binding to 0.0.0.0 exposes the debugger to the network
    app.run(host="0.0.0.0", port=8000, debug=False)

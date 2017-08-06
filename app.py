from flask import Flask, render_template, jsonify
import os


app = Flask(__name__)

@app.route('/nuclearviz')
def root():
    return app.send_static_file('nIndex.html')


@app.route("/nuclearviztemplate")
def index2():
    return render_template("Index.html")


@app.route("/test")
def test():
    return render_template("test.html")

# http://bl.ocks.org/WillTurman/4631136
# http://bl.ocks.org/lgrammel/1963983

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 50033))
    app.run(host='0.0.0.0', port=port,debug=True)

#### MAIN APP ####


#   Import things
import uuid
import json

from flask import Flask, flash, render_template, session, request, url_for, redirect
from flask_mysqldb import MySQL
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired

#   Create an instance of this class
app = Flask(__name__)
app.secret_key = 'secretkey'

#   Setup the mysql connection and create an instace of it
app.config['MYSQL_HOST'] = 'mysql.ytmarker.com'
app.config['MYSQL_USER'] = 'ytmarkercom1'
app.config['MYSQL_PASSWORD'] = 'a!NS^iuHd98shad!9cadw^^s83N^sda'
app.config['MYSQL_DB'] = 'ytmarker_com'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

#   Setup the email connection and create an instance of it
app.config['MAIL_SERVER'] = 'smtp.dreamhost.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = 'no-reply@ytmarker.com'
app.config['MAIL_PASSWORD'] = 'ndan^sio!!!dnoaDWO^^3d09ajDASLN'
app.config['MAIL_DEFAULT_SENDER'] = 'no-reply@ytmarker.com'
app.config['MAIL_MAX_EMAILS'] = 5
app.config['MAIL_SUPPRESS_SEND'] = False

mail = Mail()
mail.init_app(app)

s = URLSafeTimedSerializer('secretkey')

#   Return the basic index template
@app.route('/')
def index():
    if session:
        return render_template('index.html', session=session)
    else:
        return render_template('index.html')


#   Returns the register template
@app.route('/register', methods=["GET", "POST"])
def register():
    #   If they submit the request form
    if request.method == "POST":
        #   Get their email
        email = request.form['email']

        #   Ensure the forms are all correct and there
        if not email:
            flash("Please input an email")
            return render_template("register.html")

        if len(email) > 50:
            flash("That email is too long!")
            return render_template("register.html")

        username = request.form['username']

        if not username:
            flash("Please input a username")
            return render_template("register.html")

        if len(username) > 20:
            flash("That email is too long - keep it under 20 characters!")
            return render_template("register.html")

        password = request.form['password']

        if not password:
            flash("Please input a password")
            return render_template("register.html")

        if not request.form['confirm_password']:
            flash("Please confirm your password")
            return render_template("register.html")

        if request.form['password'] != request.form['confirm_password']:
            flash("Those passwords do not match!")
            return render_template("register.html")

        if len(password) > 20:
            flash("That password is too long - keep it under 20 characters!")
            return render_template("register.html")

        #   Open connection to database
        con = mysql.connection
        cur = con.cursor()

        #   Create the tempusers table if it doesn't exist
        cur.execute('CREATE TABLE IF NOT EXISTS tempusers (email VARCHAR(50) PRIMARY KEY UNIQUE, username VARCHAR(20) UNIQUE NOT NULL, hash VARCHAR(100) NOT NULL)')
        
        #   Create the users table if it doesn't exist
        cur.execute('CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(50) UNIQUE, username VARCHAR(20) UNIQUE NOT NULL, hash VARCHAR(100) NOT NULL, premium BOOLEAN NOT NULL DEFAULT 0)')

        params = {
            '_email': email
        }

        #   Check if there is already a user
        query = 'SELECT * FROM users WHERE email = %(_email)s'
        cur.execute(query, params)
        data = cur.fetchall();

        if len(data) != 0:
            flash("There is already an account with that email")
            return render_template("register.html")

        query = 'SELECT * FROM tempusers WHERE email = %(_email)s'
        cur.execute(query, params)
        data = cur.fetchall();

        if len(data) != 0:
            flash("There is already an account with that email")
            return render_template("register.html")

        params = {
            '_username': username
        }

        #   Check if there is already a user
        query = 'SELECT * FROM users WHERE username = %(_username)s'
        cur.execute(query, params)
        data = cur.fetchall()

        if len(data) != 0:
            flash("There is already an account with that username")
            return render_template("register.html")

        query = 'SELECT * FROM tempusers WHERE username = %(_username)s'
        cur.execute(query, params)
        data = cur.fetchall();

        if len(data) != 0:
            flash("There is already an account with that username")
            return render_template("register.html")

        #   Add user to database
        #   Do it this way to avoid SQL injection
        params = {
            '_email': email,
            '_username': username,
            '_hash': generate_password_hash(password)
        }

        query = 'INSERT INTO tempusers (email, username, hash) VALUES (%(_email)s, %(_username)s, %(_hash)s)'

        cur.execute(query, params)

        con.commit()

        #   Generate a token
        token = s.dumps(email, salt='confirmthe-email')

        #   Create a email message with link to confirm
        msg = Message('Confirm Email', sender=('YTMarker', 'no-reply@ytmarker.com'), recipients=[email])

        link = url_for('confirm_email', token=token, _external=True)

        msg.body = 'Please confirm your email, {}.\r\n\r\n{}\r\n\r\nIf you did not register for an account at YTMarker.com, please ignore this email.'.format(request.form['username'], link)

        #   Send the message
        mail.send(msg)
        flash('You have been sent a confirmation email')
        return render_template('register.html')
    else:
        return render_template('register.html')


#   Confirm the email
@app.route('/confirm_email/<token>')
def confirm_email(token):

    #   Check if the signature is expired
    try:
        email = s.loads(token, salt='confirmthe-email', max_age=1200)
    except SignatureExpired:
        flash('That token is expired!')
        return redirect('/register')

    #   Move user into perm database
    con = mysql.connection
    cur = con.cursor()

    #   Python turns tuple into values that MySQL understands so not as prone to injection
    eparams = {
        '_email': email
    }

    #   Get the data out of the temp database
    query = 'SELECT * FROM tempusers WHERE email = %(_email)s'
    cur.execute(query, eparams)
    data = cur.fetchall();

    if len(data) == 0:
        flash('That token no longer exists')
        return render_template('register.html')

    #   Insert user into new table
    params = {
        '_email': data[0]['email'],
        '_username': data[0]['username'],
        '_hash': data[0]['hash']
    }

    query = 'INSERT INTO users (email, username, hash) VALUES (%(_email)s, %(_username)s, %(_hash)s)'

    cur.execute(query, params)

    #   Remove user from old table
    equery = 'DELETE FROM tempusers WHERE email = %(_email)s'
    cur.execute(equery, eparams)

    con.commit()

    #   Log the user in
    params = {
        '_username': username,
    }

    query = 'SELECT * FROM users WHERE username = %(_username)s'

    cur.execute(query, params)
    data = cur.fetchall();

    session['id'] = data[0]['id']
    session['username'] = params['_username']

    session.permanent = False

    return redirect('/')


#   Let the user log in
@app.route('/login', methods=["POST"])
def login():
    username = request.form['username']

    if not username:
        flash("Please input a username")
        return render_template("index.html")

    password = request.form['password']

    if not password:
        flash("Please input a password")
        return render_template("index.html")

    #   Open connection to database
    con = mysql.connection
    cur = con.cursor()

    params = {
        '_username': username,
    }

    #   Check if there is already a user
    query = 'SELECT * FROM users WHERE username = %(_username)s'

    cur.execute(query, params)
    data = cur.fetchall();

    if len(data) == 0:
        flash("That username doesn't exist!")
        return render_template("index.html")

    if not check_password_hash(data[0]['hash'], password):
        flash("That password is incorrect!")
        return render_template("index.html")
    
    session['id'] = data[0]['id']
    session['username'] = params['_username']

    if request.form.get("remember"):
        session.permanent = True
    else:
        session.permanent = False


    flash('You have logged in!')
    return redirect('/')


#   Logout
@app.route('/logout')
def logout():
    session.clear()

    return render_template('index.html')


#   Forgot password
@app.route('/forgot', methods=["GET", "POST"])
def forgot():
    if request.method == 'GET':
        return render_template('forgot.html')
    else:
        email = request.form['email']

        if not email:
            flash('You must enter an email')
            return render_template('forgot.html')

        #   Check if account exists
        con = mysql.connection
        cur = con.cursor()

        #   Python turns tuple into values that MySQL understands so not as prone to injection
        eparams = {
            '_email': email
        }

        #   Get the data out of the temp database
        query = 'SELECT * FROM users WHERE email = %(_email)s'
        cur.execute(query, eparams)
        data = cur.fetchall();

        if len(data) == 0:
            flash('There is no account with that email')
            return render_template('forgot.html')

        #   Generate a token
        token = s.dumps(email, salt='forgotthe-password')

        #   Create a email message with link to confirm
        msg = Message('Forgot Password', sender=('YTMarker', 'no-reply@ytmarker.com'), recipients=[email])

        link = url_for('forgot_password', token=token, _external=True)

        msg.body = 'Hi, you requested a password reset!.\r\n\r\n{}\r\n\r\nIf you did not request to reset your password, please ignore this email.'.format(link)

        #   Send the message
        mail.send(msg)

        flash('Email sent!')
        return render_template('forgot.html')


#   Actually change the password
@app.route('/forgot_password/<token>', methods=["GET", "POST"])
def forgot_password(token):

    #   Check if the signature is expired
    try:
        email = s.loads(token, salt='forgotthe-password', max_age=1200)
    except SignatureExpired:
        flash('That token is expired!')
        return redirect('/forgot')

    #   If its get
    if request.method == "GET":
         return render_template('resetpassword.html')
    else:
        #   Check for correct forms
        password = request.form['new']
    
        if not password:
            flash('You must input a password')
            return render_template('resetpassword.html')

        if not request.form['confirm']:
            flash("Please confirm your password")
            return render_template("resetpassword.html")

        if password != request.form['confirm']:
            flash("Those passwords do not match!")
            return render_template("resetpassword.html")

        if len(password) > 20:
            flash("That password is too long - keep it under 20 characters!")
            return render_template("resetpassword.html")

        #   Open connection to database
        con = mysql.connection
        cur = con.cursor()

        params = {
            '_hash': generate_password_hash(password),
            '_email': email
        }

        query = 'UPDATE users SET hash = %(_hash)s WHERE email = %(_email)s'

        cur.execute(query, params)

        con.commit()

        flash('Password updated')
        return redirect('/')


#   Save a video
@app.route('/save', methods=["POST"])
def save():

    #   Get the info from the website
    videoID = request.form['videoID']
    info = request.form['info']

    if not session['id']:
        flash('You must be logged in to do that')
        return redirect('/')

    if not info:
        flash('You must have a video open to do that')
        return redirect('/')

    #   Open connection to database
    con = mysql.connection
    cur = con.cursor()

    #   Create the videos table if it doesn't exist
    cur.execute('CREATE TABLE IF NOT EXISTS videos (uuid VARCHAR(50) NOT NULL PRIMARY KEY UNIQUE, user_id INT NOT NULL, info TEXT NOT NULL)')

    #   Insert the user id and video info into the database
    params = {
        '_user_id': session['id']
    }

    query = 'SELECT info FROM videos WHERE user_id = %(_user_id)s'
    cur.execute(query, params)
    data = cur.fetchall();

    params = {
        '_user_id': session['id'],
        '_info': info
    }

    id = '","id":"' + videoID

    #   Update the video if it already exists
    for saved in data:
        if id in saved['info']:
            query = 'UPDATE videos SET info = %(_info)s WHERE user_id = %(_user_id)s'

            cur.execute(query, params)
            con.commit()

            flash('Video updated')
            return redirect('/')


    if len(data) >= 2:
        flash('You already have two videos saved - buy premium to save unlimited!')
        return redirect('/')

    #   Insert into database
    while True:
        uid = str(uuid.uuid4())[:11]

        params = {
            '_uuid': uid
        }

        query = 'SELECT * FROM videos WHERE uuid = %(_uuid)s'

        cur.execute(query, params)
        data = cur.fetchall();

        if (len(data) == 0):
            params = {
                '_uuid': uid,
                '_user_id': session['id'],
                '_info': info
            }

            query = 'INSERT INTO videos (uuid, user_id, info) VALUES (%(_uuid)s, %(_user_id)s, %(_info)s)'

            cur.execute(query, params)
            con.commit()

            flash('Video saved')
            return redirect('/')


#   Remove a saved video
@app.route('/deleteVideo', methods=["POST"])
def deleteVideo():

    info = request.form['info']

    if not session['id']:
        flash('You must be logged in to do that')
        return redirect('/')

    if not info:
        flash("That video doesn't exist in the database")
        return redirect('/')

    #   Open connection to database
    con = mysql.connection
    cur = con.cursor()

    params = {
        '_user_id': session['id'],
        '_info': info
    }

    query = 'DELETE FROM videos WHERE user_id = %(_user_id)s AND info = %(_info)s'

    cur.execute(query, params)
    con.commit()

    flash('Video Deleted')
    return redirect('/')


#   Return a page with all the videos
@app.route('/saved')
def saved():

    #   Open connection to database
    con = mysql.connection
    cur = con.cursor()

    #   Insert the user id and video info into the database
    params = {
        '_user_id': session['id']
    }

    query = 'SELECT uuid, info FROM videos WHERE user_id = %(_user_id)s'
    cur.execute(query, params)
    data = cur.fetchall();

    for video in data:
        afterID = video['info'].split('","id":"', 1)[1]

        ID = afterID.split('","time":"', 1)[0]

        video['id'] = ID

    return render_template('saved.html', videos=data)


#   Load a video
@app.route('/video/<token>')
def video(token):
    con = mysql.connection
    cur = con.cursor()

    params = {
        '_token': token
        }

    query = 'SELECT info FROM videos WHERE uuid = %(_token)s'

    cur.execute(query, params)
    data = cur.fetchall()

    if len(data) != 1:
        flash("That video doesn't exist")
        return render_template('index.html', session=session) 

    info = json.loads(data[0]['info'])

    if session:
        return render_template('index.html', video=info, session=session)
    else:
        return render_template('index.html', video=info)


if __name__ == '__main__':
    app.debug = True
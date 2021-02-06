#### MAIN APP ####


#   Import things
import uuid
import json
import stripe
import os

from . import config
from flask import Flask, flash, render_template, session, request, url_for, redirect, Markup, send_from_directory, jsonify, render_template_string
from flask_mysqldb import MySQL
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired

#   Create an instance of this class
app = Flask(__name__)
app.secret_key = config.SECRET_KEY

#   Setup the mysql connection and create an instace of it
app.config['MYSQL_HOST'] = config.MYSQL_HOST
app.config['MYSQL_USER'] = config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DB
app.config['MYSQL_CURSORCLASS'] = config.MYSQL_CURSORCLASS

mysql = MySQL(app)

#   Setup the email connection and create an instance of it
app.config['MAIL_SERVER'] = config.MAIL_SERVER
app.config['MAIL_PORT'] = config.MAIL_PORT
app.config['MAIL_USE_SSL'] = config.MAIL_USE_SSL
app.config['MAIL_USERNAME'] = config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = config.MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = config.MAIL_DEFAULT_SENDER
app.config['MAIL_MAX_EMAILS'] = config.MAIL_MAX_EMAILS
app.config['MAIL_SUPPRESS_SEND'] = config.MAIL_SUPPRESS_SEND

mail = Mail()
mail.init_app(app)

s = URLSafeTimedSerializer(config.SECRET_KEY)

stripe.api_key = config.STRIPE_SECRET_KEY
endpoint_secret = config.ENDPOINT_SECRET

#   Return robots.txt and sitemap.xml
@app.route('/robots.txt')
@app.route('/sitemap.xml')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])


#   Return the basic index template
@app.route('/')
def index():
    if session:
        return render_template('index.html', session=session, premium=isPremium())
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
        #cur.execute('CREATE TABLE IF NOT EXISTS tempusers (email VARCHAR(50) PRIMARY KEY UNIQUE, \
        #username VARCHAR(20) UNIQUE NOT NULL, hash VARCHAR(100) NOT NULL)')
        
        #   Create the users table if it doesn't exist
        #cur.execute('CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(50) \
        #UNIQUE, username VARCHAR(20) UNIQUE NOT NULL, hash VARCHAR(100) NOT NULL, premium BOOLEAN NOT NULL DEFAULT 0, cus_id VARCHAR(30) NOT NULL)')

        params = {
            '_email': email
        }

        #   Check if there is already a user
        query = 'SELECT * FROM users WHERE email = %(_email)s'
        cur.execute(query, params)
        data = cur.fetchall()

        if len(data) != 0:
            flash("There is already an account with that email")
            return render_template("register.html")

        query = 'SELECT * FROM tempusers WHERE email = %(_email)s'
        cur.execute(query, params)
        data = cur.fetchall()

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
        data = cur.fetchall()

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

        msg.body = 'Please confirm your email, {}.\r\n\r\n{}\r\n\r\nIf you did not register for an account at \
        YTMarker.com, please ignore this email.'.format(request.form['username'], link)

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
    data = cur.fetchall()

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
        '_username': data[0]['username']
    }

    query = 'SELECT * FROM users WHERE username = %(_username)s'

    cur.execute(query, params)
    data = cur.fetchall()

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
        '_username': username
    }

    #   Check if there is already a user
    query = 'SELECT * FROM users WHERE username = %(_username)s'

    cur.execute(query, params)
    data = cur.fetchall()

    if len(data) == 0:
        flash("That username doesn't exist!")
        return render_template("index.html")

    if not check_password_hash(data[0]['hash'], password):
        flash("That password is incorrect!")
        return render_template("index.html")
    
    #   Log user in
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
        data = cur.fetchall()

        if len(data) == 0:
            flash('There is no account with that email')
            return render_template('forgot.html')

        #   Generate a token
        token = s.dumps(email, salt='forgotthe-password')

        #   Create a email message with link to confirm
        msg = Message('Forgot Password', sender=('YTMarker', 'no-reply@ytmarker.com'), recipients=[email])

        link = url_for('forgot_password', token=token, _external=True)

        msg.body = 'Hi, you requested a password reset!.\r\n\r\n{}\r\n\r\nIf you did not request to reset your \
        password, please ignore this email.'.format(link)

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

        #   Open connection to database and save information
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
        return ''

    if not info:
        flash('You must have a video open to do that')
        return ''

    #   Open connection to database
    con = mysql.connection
    cur = con.cursor()

    #   Create the videos table if it doesn't exist
    cur.execute('CREATE TABLE IF NOT EXISTS videos (uuid VARCHAR(50) NOT NULL PRIMARY KEY UNIQUE, user_id \
    INT NOT NULL, info TEXT NOT NULL)')

    #   Insert the user id and video info into the database
    params = {
        '_user_id': session['id']
    }

    query = 'SELECT uuid, info FROM videos WHERE user_id = %(_user_id)s'
    cur.execute(query, params)
    data = cur.fetchall()

    id = '","id":"' + videoID

    #   Update the video if it already exists
    for saved in data:
        if id in saved['info']:
            params = {
                '_uuid': saved['uuid'],
                '_info': info
            }

            query = 'UPDATE videos SET info = %(_info)s WHERE uuid = %(_uuid)s'

            cur.execute(query, params)
            con.commit()

            flash(Markup('<a class="link-saved-video" data-toggle="tooltip" title="Click to copy" \
            data-placement="top" href="#">www.ytmarker.com/video/' + saved['uuid'] + '</a> updated'))
            return ''

    #   If they have two videos saved already and arn't a premium member
    if len(data) >= 2 and isPremium() == False:
        flash(Markup('You already have two videos saved - upgrade to <a class="dropdown-item" href="/premium">\
        <span style="color: gold">premium here</span></a> to save unlimited!'))
        return ''

    #   While the uuid is already in use (loop breaks when it isn't)
    while True:
        uid = str(uuid.uuid4())[:11]

        params = {
            '_uuid': uid
        }

        query = 'SELECT * FROM videos WHERE uuid = %(_uuid)s'

        cur.execute(query, params)
        data = cur.fetchall()

        #   Checck if the uuid is already in use
        if (len(data) == 0):
            
            #   Insert video into database
            params = {
                '_uuid': uid,
                '_user_id': session['id'],
                '_info': info
            }

            query = 'INSERT INTO videos (uuid, user_id, info) VALUES (%(_uuid)s, %(_user_id)s, %(_info)s)'

            cur.execute(query, params)
            con.commit()

            flash(Markup('Video saved at link <a class="link-saved-video" data-toggle="tooltip" title="Click \
            to copy" data-placement="top" href="#">www.ytmarker.com/video/' + uid + '</a>'))
            return ''


#   Remove a saved video
@app.route('/deleteVideo', methods=["POST"])
def deleteVideo():

    info = request.form['info']

    if not session['id']:
        flash('You must be logged in to do that')
        return ''

    if not info:
        flash("That video doesn't exist in the database")
        return ''

    #   Open connection to database and remove the video
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
    return ''


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
    data = cur.fetchall()

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

    #   Load the video info into readable format
    info = json.loads(data[0]['info'])

    if session:
        return render_template('index.html', video=info, session=session)
    else:
        return render_template('index.html', video=info)


#   Return premium template
@app.route('/premium')
def premium():
    return render_template('premium.html')


#   Call the isPremium function through a link
@app.route('/getIsPremium')
def getIsPremium():
    premium = isPremium()
    if premium:
        return 'True'
    else:
        return 'False'

#   Check if the user is premium
def isPremium():
    con = mysql.connection
    cur = con.cursor()

    params = {
            '_user_id': session['id']
        }

    query = 'SELECT premium FROM users WHERE id = %(_user_id)s'

    cur.execute(query, params)
    data = cur.fetchall()

    if (data[0]['premium'] == 1):
        return True
    else:
        return False


#   Create a checkout session
@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():

    #   Attempt to create the session, if it fails return an exception
    try:
        checkout_session = stripe.checkout.Session.create(
            #   Destination upon successful purchace
            success_url="https://ytmarker.com/success",
            #   Destination upon cancellation
            cancel_url="https://ytmarker.com/premium",
            #   How they pay
            payment_method_types=["card"],
            #   The type of purchace (subscription in  this case)
            mode="subscription",
            #   The information necessary for this to work
            line_items=[
                {
                    "price": 'price_1IH4bQG7d9GmhCkUxEwBw2Gm',
                    "quantity": 1
                }
            ],
            customer_email=getCusEmail()
        )
        #   Return the checkout session so it can be loaded
        return jsonify({'sessionId': checkout_session['id']})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


#   Get the checkout session
@app.route('/checkout-session', methods=['GET'])
def get_checkout_session():
    #   Get the sessionID
    id = request.args.get('sessionId')
    checkout_session = stripe.checkout.Session.retrieve(id)

    #   Return the checkout session
    return jsonify(checkout_session)


#   Listen and react to stripe webhooks
@app.route('/webhook', methods=['POST'])
def webhook():
    event = None
    payload = request.data
    try:
        event = json.loads(payload)
    except:
        return jsonify({'error': {'message': str('Webhook error while parsing basic request')}}), 400

        #   Verify the endpoint secret
        if endpoint_secret:
            sig_header = request.headers.get('stripe-signature')
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, endpoint_secret
                )
            except stripe.error.SignatureVerificationError as e:
                print(str(e))
                return jsonify(success=True)

    event_type = event['type']
    data_object = event['data']['object']


    #   When checkout is completed
    if event_type == 'checkout.session.completed':

        #   Add premium to the account
        con = mysql.connection
        cur = con.cursor()

        params = {
            '_email': data_object['customer_details']['email'],
            '_cus_id': data_object['customer']
        }

        query = 'UPDATE users SET cus_id = %(_cus_id)s, premium = 1 WHERE email = %(_email)s'

        cur.execute(query, params)
        con.commit()


    #   If the subscription is cancelled
    elif event_type == 'customer.subscription.deleted':
        con = mysql.connection
        cur = con.cursor()

        params = {
                '_cus_id': data_object['customer']
            }

        query = 'UPDATE users SET premium = 0 WHERE cus_id = %(_cus_id)s'

        cur.execute(query, params)
        con.commit()

        #   Send them an email about deleted subscription

    else:
      print('Unhandled event type {}'.format(event_type))

    return jsonify(success=True)


#   The success template for when the stripe checkout recieves a successful purchace
@app.route('/success', methods=['GET'])
def success():
    flash("Thank you for purchasing premium! Your account should activate shortly, otherwise I can be contacted at joerwuthrich@gmail.com")
    return redirect('/')


#   Create customer portal
@app.route('/create-customer-portal-session', methods=['POST'])
def customer_portal_session():
  # Authenticate your user.
  session = stripe.billing_portal.Session.create(
    customer=getCusID(),
    return_url='https://ytmarker.com',
  )
  return redirect(session.url)


#   Terms & Conditions
@app.route('/termsandconditions')
def termsandconditions():
    return render_template('termsandconditions.html')


#   Privacy Policy
@app.route('/privacypolicy')
def privacypolicy():
    return render_template('privacypolicy.html')


#   Get stripe customer ID
def getCusID():
    con = mysql.connection
    cur = con.cursor()

    params = {
            '_user_id': session['id']
        }

    query = 'SELECT cus_id FROM users WHERE id = %(_user_id)s'

    cur.execute(query, params)
    data = cur.fetchall()

    return data[0]['cus_id']


#   Get customer email
def getCusEmail():
    con = mysql.connection
    cur = con.cursor()

    params = {
            '_user_id': session['id']
        }

    query = 'SELECT email FROM users WHERE id = %(_user_id)s'

    cur.execute(query, params)
    data = cur.fetchall()

    return data[0]['email']


if __name__ == '__main__':
    app.debug = True